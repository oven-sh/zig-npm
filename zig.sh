#!/bin/bash

set -euo pipefail

parent_dir=$(dirname $BASH_SOURCE[0])

if [[ $(uname) == "Darwin" ]]; then

    if [[ $(uname -m) == "arm64" ]]; then

        $parent_dir/../zig-darwin-arm64/zig "$@"

    else

        $parent_dir/../zig-darwin-x64/zig "$@"

    fi

elif [[ $(uname) == "Linux" ]]; then

    if [[ $(uname -m) == "aarch64" ]]; then

        $parent_dir/../zig-linux-arm64/zig "$@"
    else

        $parent_dir/../zig-linux-x64/zig "$@"

    fi

elif [[ $(uname) == "Windows" ]]; then

    if [[ $(uname -m) == "x86_64" ]]; then

        $parent_dir/../zig-win32-x64/zig.exe "$@"

    else

        $parent_dir/../zig-win32-x86/zig.exe "$@"

    fi

else

    echo "Unsupported platform"
    exit 1

fi
