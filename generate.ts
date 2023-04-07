import {
  chmodSync,
  existsSync,
  mkdirSync,
  rename,
  renameSync,
  rmSync,
} from "fs";
import { basename, dirname, extname, join } from "path";

const SOURCES_URL =
  process.env.SOURCES_URL ||
  "https://cdn.jsdelivr.net/gh/mitchellh/zig-overlay@main/sources.json";

const response = await fetch(SOURCES_URL);

const sources: any = await response.json();

const zigVersion = process.env.ZIG_VERSION || "latest";
const latest = sources?.master?.[zigVersion] ?? null;
if (!latest) {
  throw new Error(`zig version: "${zigVersion}" not found in ${SOURCES_URL}`);
}

class Download {
  constructor(
    public readonly url: string,
    public readonly arch: string,
    public readonly os: string,
    public readonly version: string,
    public blob: Blob
  ) {}

  async extractTarGz() {
    const { exited } = Bun.spawn({
      cmd: ["tar", "xzf", basename(this.url)],
      cwd: process.cwd(),
      stderr: "ignore",
      stdin: "inherit",
      stdout: "ignore",
    });
    await exited;
  }

  async extractZip() {
    const { exited } = Bun.spawn({
      cmd: ["unzip", basename(this.url)],
      cwd: process.cwd(),
      stderr: "ignore",
      stdin: "inherit",
      stdout: "ignore",
    });
    await exited;
  }

  extractTarXz() {
    return this.extractTarGz();
  }

  get fileName() {
    return basename(this.url);
  }
  packageName: string = "";

  get folder() {
    return join(process.cwd(), basename(this.url)).replaceAll(
      /(\.tar\.gz|\.tgz|\.gz|\.zip|\.tar\.xz|\.txz|\.xz)$/g,
      ""
    );
  }

  async extract() {
    if (existsSync(this.folder))
      rmSync(this.folder, { recursive: true, force: true });

    await Bun.write(this.fileName, this.blob);

    // @ts-expect-error
    this.blob = undefined;

    const filename = this.fileName;
    const ext = extname(filename);
    if (ext === ".tar.gz" || ext === ".tgz" || ext === ".gz") {
      return this.extractTarGz();
    } else if (ext === ".zip") {
      return this.extractZip();
    } else if (ext === ".tar.xz" || ext === ".txz" || ext === ".xz") {
      return this.extractTarXz();
    } else {
      throw new Error(`unsupported archive type: ${ext}`);
    }
  }

  async generatePackage() {
    const packageJSON = {
      version: this.version,
      description: "",
      os: [
        {
          darwin: "darwin",
          linux: "linux",
          windows: "win32",
        }[this.os],
      ],
      cpu: [
        {
          x86_64: "x64",
          aarch64: "arm64",
          i686: "x86",
          armv7: "arm",
          armv6: "arm",
          armv5: "arm",
          arm64: "arm64",
        }[this.arch],
      ],
      name: "",
      url: "",
    };
    this.packageName =
      packageJSON.name = `@oven/zig-${packageJSON.os[0]}-${packageJSON.cpu[0]}`;
    packageJSON.description = "Zig compiler for " + this.arch + "-" + this.os;
    packageJSON.url = this.url;

    const packageJSONPath = join(this.folder, "package.json");
    await Bun.write(packageJSONPath, JSON.stringify(packageJSON, null, 2));
    console.log(`Saved ${packageJSONPath}`);
    try {
      rmSync(packageJSON.name, { recursive: true, force: true });
    } catch (e) {}

    console.log(`Renaming ${this.folder} to ${packageJSON.name}`);
    try {
      if (dirname(packageJSON.name).length > 0)
        mkdirSync(dirname(packageJSON.name));
    } catch (e) {}

    renameSync(this.folder, packageJSON.name);
  }
}

const tasks = new Array<Promise<Download>>();

for (let key in latest) {
  const [arch, os] = key.split("-");
  if (!arch || !os) {
    console.warn(`invalid arch-os pair: ${key}`);
    continue;
  }

  const { url, version, sha256 } = latest[key];
  if (!url || !version || !sha256) {
    console.warn(`missing url, version, or sha256 for ${key}`);
    continue;
  }

  tasks.push(
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`failed to fetch ${url}`);
        }

        return response.blob();
      })
      .then((blob) => {
        return new Download(url, arch, os, version, blob);
      })
      .then((download) => {
        return download
          .extract()
          .then(() => download.generatePackage())
          .then(() => download);
      })
  );
}

const all = await Promise.all(tasks);

const rootPackage = {
  name: "@oven/zig",
  version: all[0].version,
  description: "Zig compiler for all platforms",
  optionalDependencies: Object.fromEntries(
    all.map((download) => [download.packageName, download.version])
  ),
  repository: "https://github.com/oven-sh/zig-npm",
  bin: {
    zig: "zig",
  },
};

try {
  rmSync("@oven/zig", { recursive: true, force: true });
} catch (e) {}

try {
  mkdirSync("@oven/zig", { recursive: true });
} catch (e) {}

try {
  await Bun.write(
    "@oven/zig/zig",
    `
#!/bin/sh
if [ uname = "Darwin" ]; then

    if [ uname -m = "arm64" ]; then

        ../zig-darwin-arm64/zig "$@"

    else

        ../zig-darwin-x64/zig "$@"

    fi

elif [ uname = "Linux" ]; then

    if [ uname -m = "aarch64" ]; then

        ../zig-linux-arm64/zig "$@"
    else

        ../zig-linux-x64/zig "$@"

    fi

elif [ uname = "Windows" ]; then

    if [ uname -m = "x86_64" ]; then

        ../zig-win32-x64/zig.exe "$@"

    else

        ../zig-win32-x86/zig.exe "$@"

    fi

else

    echo "Unsupported platform"
    exit 1

fi    
`.trim()
  );
} catch (e) {}

chmodSync("@oven/zig/zig", 0o777);

await Bun.write("@oven/zig/package.json", JSON.stringify(rootPackage, null, 2));

for (let downloaded of all) {
  if (!existsSync(downloaded.packageName)) {
    throw new Error(`missing ${downloaded.packageName}`);
  }
}

for (let downloaded of all) {
  const { exited } = Bun.spawn({
    cmd: ["npm", "publish", "--access", "public"],
    cwd: downloaded.packageName,
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });
  await exited;
}
{
  const { exited } = Bun.spawn({
    cmd: ["npm", "publish", "--access", "public"],
    cwd: "@oven/zig",
    stderr: "inherit",
    stdin: "inherit",
    stdout: "inherit",
  });
  await exited;
}

export {};
