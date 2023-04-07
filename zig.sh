#!/usr/bin/env bash

set -euo pipefail

parent_dir=$(
    cd "$(dirname "${BASH_SOURCE[0]}")"
    pwd -P
)

# find the node_modules directory and cd to it
if [[ $parent_dir == *"node_modules"* ]]; then
    while [[ ! -d "$parent_dir/node_modules" ]]; do
        if [[ "$parent_dir" == "/" ]]; then
            echo "Could not find node_modules directory"
            exit 1
        fi
        parent_dir=$(dirname "$parent_dir")
    done
fi

cd $parent_dir

if [[ $(uname) == "Darwin" ]]; then

    if [[ $(uname -m) == "arm64" ]]; then

        ./node_modules/@oven/zig-darwin-arm64/zig "$@"

    else

        ./node_modules/@oven/zig-darwin-x64/zig "$@"

    fi

elif [[ $(uname) == "Linux" ]]; then

    if [[ $(uname -m) == "aarch64" ]]; then

        ./node_modules/@oven/zig-linux-arm64/zig "$@"
    else

        ./node_modules/@oven/zig-linux-x64/zig "$@"

    fi

elif [[ $(uname) == "Windows" ]]; then

    if [[ $(uname -m) == "x86_64" ]]; then

        ./node_modules/@oven/zig-win32-x64/zig.exe "$@"

    else

        ./node_modules/@oven/zig-win32-x86/zig.exe "$@"

    fi

else

    echo "Unsupported platform"
    exit 1

fi
