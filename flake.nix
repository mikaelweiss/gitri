{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };
  outputs =
    { self, nixpkgs, ... }:
    let
      supportedSystems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];

      forEachSupportedSystem =
        f:
        nixpkgs.lib.genAttrs supportedSystems (
          system:
          let
            pkgs = import nixpkgs {
              inherit system;
            };
          in
          f { inherit pkgs; }
        );

      # only bump toolchain versions here
      toolchain = pkgs: {
        go = pkgs.go_1_27;
        buildGoModule = pkgs.buildGo127Module;
        nodejs = pkgs.nodejs_26;
        python3 = pkgs.python314;
        pnpm = pkgs.pnpm_12;
      };
    in
    {
      packages = forEachSupportedSystem (
        { pkgs, ... }:
        let
          inherit (pkgs) lib;
          inherit (toolchain pkgs) buildGoModule nodejs pnpm;

          # A fixed version keeps the dependency fetches cached across commits. The rev goes in the binary.
          version = "unstable";
          rev = self.shortRev or self.dirtyShortRev;

          frontend = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "gitea-frontend";
            inherit version;
            src = self;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              inherit pnpm;
              fetcherVersion = 4;
              hash = "sha256-AngrKVYz5iPHcHppK/Mhbw6i+bqnvtKNWBSKtES62ag=";
            };

            nativeBuildInputs = [
              nodejs
              pkgs.pnpmConfigHook
              pnpm
            ];

            buildPhase = ''
              make frontend
            '';

            installPhase = ''
              mkdir -p $out
              cp -R public $out/
            '';
          });

          gitea = buildGoModule {
            pname = "gitea";
            inherit version;
            src = self;

            proxyVendor = true;
            vendorHash = "sha256-GEJWgnechxBZfOf1PlIqZXpk4wCr3q39a3cCZ1OWpvk=";

            outputs = [
              "out"
              "data"
            ];

            subPackages = [ "." ];

            nativeBuildInputs = [ pkgs.makeWrapper ];

            env.CGO_ENABLED = 0;

            ldflags = [
              "-s"
              "-w"
              "-X main.Version=${rev}"
            ];

            postInstall = ''
              mkdir $data
              ln -s ${frontend}/public $data/public
              cp -R ./{templates,options} $data

              mv $out/bin/gitea{.dev,}
              wrapProgram $out/bin/gitea \
                --prefix PATH : ${
                  lib.makeBinPath [
                    pkgs.bash
                    pkgs.coreutils
                    pkgs.git
                    pkgs.gzip
                    pkgs.openssh
                  ]
                }
            '';

            meta = {
              license = lib.licenses.mit;
              mainProgram = "gitea";
            };
          };
        in
        {
          inherit gitea;
          default = gitea;
        }
      );

      devShells = forEachSupportedSystem (
        { pkgs, ... }:
        {
          default =
            let
              inherit (pkgs) lib;
              inherit (toolchain pkgs)
                go
                nodejs
                python3
                pnpm
                ;

              # Platform-specific dependencies
              linuxOnlyInputs = lib.optionals pkgs.stdenv.isLinux [
                pkgs.glibc.static
              ];

              linuxOnlyEnv = lib.optionalAttrs pkgs.stdenv.isLinux {
                CFLAGS = "-I${pkgs.glibc.static.dev}/include";
                LDFLAGS = "-L ${pkgs.glibc.static}/lib";
              };
            in
            pkgs.mkShell {
              packages =
                with pkgs;
                [
                  # generic
                  git
                  git-lfs
                  gnumake
                  gnused
                  gnutar
                  gzip
                  zip

                  # frontend
                  nodejs
                  pnpm
                  cairo
                  pixman
                  pkg-config

                  # linting
                  python3
                  uv

                  # backend
                  go
                  gofumpt
                  sqlite
                ]
                ++ linuxOnlyInputs;

              env = {
                GO = "${go}/bin/go";
                GOROOT = "${go}/share/go";

                TAGS = "";
                STATIC = "true";
              }
              // linuxOnlyEnv;
            };
        }
      );
    };
}
