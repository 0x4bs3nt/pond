{
  description = "Pond development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-intel-darwin.url = "github:NixOS/nixpkgs/nixpkgs-26.05-darwin";
  };

  outputs =
    { nixpkgs, nixpkgs-intel-darwin, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          # Nixpkgs unstable no longer supports Intel macOS.
          pkgs =
            (if system == "x86_64-darwin" then nixpkgs-intel-darwin else nixpkgs).legacyPackages.${system};
          bun =
            if system == "x86_64-darwin" then
              let
                # The compatible package set has an older Bun. Reuse Pond's pinned release runtime.
                runtime = (builtins.fromJSON (builtins.readFile ./tools/packaging/targets.json)).darwin-x64;
              in
              pkgs.bun.overrideAttrs {
                version = (builtins.fromJSON (builtins.readFile ./tools/packaging/licenses/provenance.json)).bun;
                src = pkgs.fetchurl {
                  url = runtime.url;
                  hash = runtime.integrity;
                };
                sourceRoot = "package/bin";
              }
            else
              pkgs.bun;
        in
        {
          default = pkgs.mkShellNoCC {
            packages = [
              bun
              pkgs.git
              pkgs.curl
              pkgs.fish
              pkgs.zsh
              pkgs.shellcheck
            ];
          };
        }
      );
    };
}
