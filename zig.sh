#!/usr/bin/env bash

set -euo pipefail

if [[ $(uname) == "Darwin" ]]; then

    parent_dir=$(
        dirname "$(realpath ${BASH_SOURCE[0]})"
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

    if [[ $(uname -m) == "arm64" ]]; then

        $parent_dir/node_modules/@oven/zig-darwin-arm64/zig "$@"

    else

        $parent_dir/node_modules/@oven/zig-darwin-x64/zig "$@"

    fi

elif [[ $(uname) == "Linux" ]]; then

    parent_dir=$(
        dirname "$(realpath ${BASH_SOURCE[0]})"
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

    if [[ $(uname -m) == "aarch64" ]]; then

        $parent_dir/node_modules/@oven/zig-linux-arm64/zig "$@"
    else

        $parent_dir/node_modules/@oven/zig-linux-x64/zig "$@"

    fi

elif [[ $(uname) == "Windows" ]]; then

    if [[ $(uname -m) == "x86_64" ]]; then

        $parent_dir/node_modules/@oven/zig-win32-x64/zig.exe "$@"

    else

        $parent_dir/node_modules/@oven/zig-win32-x86/zig.exe "$@"

    fi

else

    echo "Unsupported platform"
    exit 1

fi
