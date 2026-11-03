#!/bin/sh
# Install official Pond release archives. Keep this file self-contained for curl | sh.
set -eu

RELEASES_URL=https://github.com/0x4bs3nt/pond/releases
readonly RELEASES_URL

version=
install_dir=
modify_path=true
path_status=manual
work=
stage=
lock=
launcher=

fail() {
    printf 'pond installer: %s\n' "$*" >&2

    exit 1
}

note() {
    printf '%s\n' "$*"
}

usage() {
    cat <<'HELP'
Usage: sh install.sh [--version VERSION] [--install-dir DIRECTORY] [--no-modify-path]
Install the latest stable Pond release, or select a version (with or without v).
Default directory: $HOME/.local/bin. Never uses sudo or replaces unrelated files.
--no-modify-path leaves shell configuration untouched.
HELP
}

parse_arguments() {
    install_dir=${HOME:?HOME must be set}/.local/bin

    while [ "$#" -gt 0 ]; do
        case "$1" in
            --version|--install-dir)
                [ "$#" -ge 2 ] || fail "$1 requires a value."
                [ -n "$2" ] || fail "$1 requires a nonempty value."
                case "$1" in
                    --version)
                        version=${2#v}
                        ;;
                    --install-dir)
                        install_dir=$2
                        ;;
                esac
                shift 2
                ;;
            --no-modify-path)
                modify_path=false
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                fail "Unknown argument: $1. Use --help."
                ;;
        esac
    done
}

check_requirements() {
    for tool in curl tar awk sed grep mktemp uname readlink; do
        command -v "$tool" >/dev/null 2>&1 || fail "Required command not found: $tool"
    done
}

validate_install_directory() {
    case "$install_dir" in
        /*) ;;
        *) fail '--install-dir must be absolute.' ;;
    esac
    carriage_return=$(printf '\r')
    case "$install_dir" in
        *:*) fail 'Installation paths cannot contain colons (PATH separator).' ;;
    esac
    case "$install_dir" in *'
'*|*"$carriage_return"*)
            fail 'Installation paths cannot contain newlines or carriage returns.'
            ;;
    esac
}

detect_target() {
    os=$(uname -s)
    cpu=$(uname -m)

    case "$os" in
        Darwin)
            os=darwin
            if [ "$(sysctl -in sysctl.proc_translated 2>/dev/null || :)" = 1 ]; then
                cpu=arm64
            fi
            ;;
        Linux)
            os=linux
            ;;
        *)
            fail "Unsupported OS: $os. Windows users should download a Windows release archive."
            ;;
    esac

    case "$cpu" in
        x86_64|amd64) cpu=x64 ;;
        arm64|aarch64) cpu=arm64 ;;
        *) fail "Unsupported architecture: $cpu" ;;
    esac

    target=$os-$cpu
    if [ "$os" = linux ]; then
        libc=$(ldd --version 2>&1 || :)
        case "$libc" in
            *musl*) target=$target-musl ;;
            *GLIBC*|*glibc*|*'GNU libc'*|*'GNU C Library'*) ;;
            *) fail 'Cannot identify Linux libc. Download the appropriate glibc or musl archive manually.' ;;
        esac
    fi
}

select_hash_tool() {
    if command -v sha256sum >/dev/null 2>&1; then
        hash_tool=sha256sum
    elif command -v shasum >/dev/null 2>&1; then
        hash_tool=shasum
    else
        fail 'Install sha256sum or shasum to verify downloads.'
    fi
}

cleanup() {
    [ -z "$work" ] || rm -rf "$work"

    if [ -n "$stage" ] && [ "$(readlink "$launcher" 2>/dev/null || :)" != "$stage/pond" ]; then
        rm -rf "$stage"
    fi

    if [ -n "$lock" ]; then
        rm -f "$lock/pond"
        rmdir "$lock"
    fi
}

prepare_temporary_directory() {
    work=$(mktemp -d "${TMPDIR:-/tmp}/pond-install.XXXXXXXX")

    trap cleanup 0
    trap 'exit 130' INT
    trap 'exit 143' TERM
    trap 'exit 129' HUP
}

fetch() {
    curl --fail --silent --show-error --location \
        --proto '=https' --proto-redir '=https' \
        --connect-timeout 15 --retry 2 "$@"
}

download() {
    fetch --max-time 300 --output "$2" "$1" || fail "Download failed: $1"
}

resolve_version() {
    if [ -z "$version" ]; then
        latest=$(fetch --max-time 60 --output /dev/null --write-out '%{url_effective}' \
            "$RELEASES_URL/latest") || fail 'Could not resolve the latest stable release.'
        case "$latest" in
            "$RELEASES_URL/tag/v"*) version=${latest##*/v} ;;
            *) fail 'Unexpected latest release URL.' ;;
        esac
    fi

    printf '%s\n' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || fail 'Expected a stable version such as 0.3.3.'
}

download_release() {
    archive=pond-v$version-$target.tar.gz
    archive_path=$work/$archive
    checksums_path=$work/SHA256SUMS
    release_url=$RELEASES_URL/download/v$version

    note "Installing Pond $version ($target)..."

    download "$release_url/$archive" "$archive_path"
    download "$release_url/SHA256SUMS" "$checksums_path"
}

verify_checksum() {
    expected=$(awk -v name="$archive" '$2 == name { print $1 }' "$checksums_path")
    [ "${#expected}" -eq 64 ] || fail 'Missing or duplicate checksum entry.'

    case "$expected" in
        *[!0-9a-f]*) fail 'Invalid SHA-256 checksum.' ;;
    esac

    if [ "$hash_tool" = sha256sum ]; then
        actual=$(sha256sum "$archive_path")
    else
        actual=$(shasum -a 256 "$archive_path")
    fi
    [ "${actual%% *}" = "$expected" ] || fail 'Checksum mismatch; existing installation was not changed.'
}

validate_archive() {
    tar -tzf "$archive_path" > "$work/entries" || fail 'Invalid archive.'
    awk '
        /^\// || /(^|\/)\.\.(\/|$)/ || /[[:cntrl:]]/ { exit 1 }
        END { if (NR == 0) exit 1 }
    ' "$work/entries" || fail 'Unsafe archive path.'
    tar -tvzf "$archive_path" > "$work/kinds" || fail 'Invalid archive metadata.'
    LC_ALL=C awk 'substr($0,1,1) != "-" && substr($0,1,1) != "d" { exit 1 }' "$work/kinds" \
        || fail 'Archive contains links or special files.'
}

prepare_installation() {
    mkdir -p "$install_dir"

    install_dir=$(cd "$install_dir" && pwd -P)
    root=$install_dir/.pond

    [ ! -L "$root" ] || fail 'The managed .pond directory must not be a symlink.'

    mkdir -p "$root"
    if mkdir "$root/install.lock" 2>/dev/null; then
        lock=$root/install.lock
    else
        fail "Another installation is running (or a stale lock exists): $root/install.lock"
    fi

    launcher=$install_dir/pond
    [ ! -d "$launcher" ] || fail "Refusing to replace a directory: $launcher"
    if [ -L "$launcher" ]; then
        previous=$(readlink "$launcher")
        case "$previous" in
            "$root"/release-*/pond) ;;
            *) fail "Refusing to replace unrelated symlink: $launcher" ;;
        esac
    elif [ -e "$launcher" ]; then
        fail "Refusing to replace an existing file: $launcher. Choose another --install-dir."
    fi
}

install_release() {
    stage=$(mktemp -d "$root/release-$version-$target.XXXXXXXX")

    tar -xzf "$archive_path" -C "$stage" || fail 'Extraction failed.'
    chmod 700 "$stage"

    [ -f "$stage/pond" ] && [ -x "$stage/pond" ] || fail 'Archive has no executable pond.'
    [ -f "$stage/LICENSE" ] && [ -d "$stage/licenses" ] || fail 'Archive is missing license notices.'

    if ! installed_version=$("$stage/pond" --version); then
        fail 'Executable validation failed. On NixOS, configure nix-ld/runtime libraries or use the future Nix package. On macOS, check Gatekeeper guidance in docs/packaging.md.'
    fi

    [ "$installed_version" = "$version" ] || fail "Executable version does not match $version."

    ln -s "$stage/pond" "$lock/pond"
    mv -f "$lock/pond" "$launcher"

    stage=
}

show_success() {
    if [ -t 1 ] && [ "${TERM:-dumb}" != dumb ]; then
        cat <<'ART'

                  /\_/\
                 ( o.o )     ██╗
                  /|_|\_)    ██║
    █████╗  ████╗ █████╗  █████║
    ██╔═██╗██╔═██╗██╔═██╗██╔═██║
    █████╔╝╚████╔╝██║ ██║╚█████║
    ██╔══╝  ╚═══╝ ╚═╝ ╚═╝ ╚════╝
    ██║
    ╚═╝

ART
    fi

    note "Installed Pond $version at $launcher"
    case "$path_status" in
        ready)
            note 'Pond is on PATH. Run pond to start it.'
            ;;
        added|configured)
            if [ "$path_status" = added ]; then
                note "Added Pond to PATH in $config."
            else
                note "Pond is already configured on PATH in $config."
            fi
            note 'Open a new terminal and run pond to start it.'
            note "To start it now, use $launcher."
            ;;
        manual)
            note "Run $launcher to start Pond."
            ;;
    esac
}

configure_path() {
    case ":${PATH:-}:" in
        *":$install_dir:"*)
            path_status=ready
            return 0
            ;;
    esac
    [ "$modify_path" = true ] || return 0

    shell=${SHELL:-}
    case "${shell##*/}" in
        fish)
            config=${XDG_CONFIG_HOME:-$HOME/.config}/fish/config.fish
            quoted=$(printf '%s' "$install_dir" | sed "s/\\\\/\\\\\\\\/g; s/'/\\\\'/g")
            entry="fish_add_path -- '$quoted'"
            ;;
        bash|zsh)
            quoted=$(printf '%s' "$install_dir" | sed "s/'/'\\\\''/g")
            entry="export PATH='$quoted':\"\$PATH\""
            if [ "${shell##*/}" = zsh ]; then
                config=${ZDOTDIR:-$HOME}/.zshrc
            else
                config=$HOME/.bashrc
            fi
            ;;
        *)
            note "Add $install_dir to PATH in your shell configuration."
            return 0
            ;;
    esac

    if [ -f "$config" ] && grep -Fqx "$entry" "$config"; then
        path_status=configured
        return 0
    fi

    if (mkdir -p "$(dirname "$config")" && printf '\n# Pond installer\n%s\n' "$entry" >> "$config"); then
        path_status=added
    else
        note "Could not update $config. Add $install_dir to PATH manually."
    fi
}

main() {
    parse_arguments "$@"
    check_requirements
    validate_install_directory
    detect_target
    select_hash_tool
    prepare_temporary_directory
    resolve_version
    download_release
    verify_checksum
    validate_archive
    prepare_installation
    install_release
    configure_path
    show_success
}

main "$@"
