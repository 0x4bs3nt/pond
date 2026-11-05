{
  description = "PostgreSQL for local Pond development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-intel-darwin.url = "github:NixOS/nixpkgs/nixpkgs-26.05-darwin";
  };

  outputs = { nixpkgs, nixpkgs-intel-darwin, ... }: {
    apps = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ] (
      system:
      let
        pkgs =
          (if system == "x86_64-darwin" then nixpkgs-intel-darwin else nixpkgs).legacyPackages.${system};
        server = pkgs.writeShellApplication {
          name = "pond-postgres";
          runtimeInputs = [
            pkgs.postgresql_17
            pkgs.coreutils
          ];
          text = ''
            umask 077
            directory="''${XDG_DATA_HOME:-$HOME/.local/share}/pond/dev-postgres"
            mkdir -p "$directory"
            pid=

            cleanup() {
              if [[ -n "$pid" ]]; then
                kill -INT "$pid" 2>/dev/null || true
                wait "$pid" 2>/dev/null || true
              fi
            }

            trap cleanup EXIT
            trap 'exit 130' INT
            trap 'exit 143' TERM

            if [[ ! -f "$directory/PG_VERSION" ]]; then
              initdb -D "$directory" --username=pond --auth=trust --no-locale --encoding=UTF8 >/dev/null
            fi

            echo 'PostgreSQL: 127.0.0.1:5432 | database: postgres | user: pond | no password | TLS: disable'
            echo "Data: $directory"
            echo 'Ctrl+C stops PostgreSQL; data is preserved for the next run.'

            postgres -D "$directory" -h 127.0.0.1 -p 5432 -c unix_socket_directories= &
            pid=$!
            wait "$pid"
          '';
        };
      in
      {
        default = {
          type = "app";
          meta.description = "Run a persistent local PostgreSQL 17 instance";
          program = "${server}/bin/pond-postgres";
        };
      }
    );
  };
}
