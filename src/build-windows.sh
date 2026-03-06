#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Ensure local wrapper for tauri's expected makensis.exe command
mkdir -p "$PROJECT_ROOT/.toolchain-bin"
cat > "$PROJECT_ROOT/.toolchain-bin/makensis.exe" <<'WRAP'
#!/usr/bin/env bash
set -euo pipefail
exec /opt/homebrew/bin/makensis "$@"
WRAP
chmod +x "$PROJECT_ROOT/.toolchain-bin/makensis.exe"

# Prereq checks
command -v brew >/dev/null || { echo "Homebrew not found"; exit 1; }
command -v rustup >/dev/null || { echo "rustup not found"; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm not found"; exit 1; }

# Install/ensure toolchains
echo "[1/3] Ensuring toolchains..."
brew list mingw-w64 >/dev/null 2>&1 || brew install mingw-w64
brew list makensis >/dev/null 2>&1 || brew install nsis
rustup target add x86_64-pc-windows-gnu >/dev/null

# Build
echo "[2/3] Building Windows target..."
cd "$PROJECT_ROOT"
PATH="$PROJECT_ROOT/.toolchain-bin:$PATH" pnpm tauri build --target x86_64-pc-windows-gnu

# Output
echo "[3/3] Done"
echo "EXE:       $PROJECT_ROOT/src-tauri/target/x86_64-pc-windows-gnu/release/viber.exe"
echo "Installer: $PROJECT_ROOT/src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/Viber_0.1.0_x64-setup.exe"
