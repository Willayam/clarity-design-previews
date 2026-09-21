#!/bin/bash
set -euo pipefail
[[ "$(uname -s)" == Darwin ]] || { echo 'This installer is for macOS.' >&2; exit 1; }
case "$(uname -m)" in
  arm64) arch=arm64; digest=c27ab8fd0aa489449e3d201eb02f957ef460a13b613662928b1b23394bf1bcfe ;;
  x86_64) arch=amd64; digest=ff0d3b51d5ff70eceef89d6b32145fee985018a2174596a5dbe405e2766e2ac4 ;;
  *) echo 'Unsupported Mac architecture.' >&2; exit 1 ;;
esac
preview_tmp=$(mktemp -d)
trap 'rm -rf "$preview_tmp"' EXIT
curl -fsSL --retry 2 "https://github.com/cloudflare/cloudflared/releases/download/2026.9.1/cloudflared-darwin-${arch}.tgz" -o "$preview_tmp/cloudflared.tgz"
printf '%s  %s\n' "$digest" "$preview_tmp/cloudflared.tgz" | shasum -a 256 -c -
tar -xzf "$preview_tmp/cloudflared.tgz" -C "$preview_tmp"
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/localhost-preview"
printf '{}\n' > "$HOME/.local/share/localhost-preview/config.yml"
install -m 755 "$preview_tmp/cloudflared" "$HOME/.local/bin/cloudflared"
cat > "$HOME/.local/bin/localhost-preview" <<'WRAPPER'
#!/bin/bash
set -euo pipefail
if [[ ${1:-} == --help || ${1:-} == -h ]]; then
  echo 'Usage: localhost-preview [port] (default: 5173)'
  echo 'Start your local app first. Open the printed HTTPS URL on your phone.'
  echo 'Keep this terminal running. Ctrl-C stops sharing. Each run gets a new URL.'
  exit 0
fi
port=${1:-5173}
if [[ $# -gt 1 || ! "$port" =~ ^[0-9]{1,5}$ ]]; then
  echo 'Usage: localhost-preview [port from 1 to 65535]' >&2; exit 1
fi
port=$((10#$port))
if (( port < 1 || port > 65535 )); then
  echo 'Port must be between 1 and 65535.' >&2; exit 1
fi
if ! curl --silent --output /dev/null --max-time 5 "http://127.0.0.1:$port/"; then
  echo "Start your app on port $port first, then run this command again." >&2
  exit 1
fi
echo "Sharing http://localhost:$port. Open the HTTPS link printed below on your phone."
echo 'Keep this terminal running; press Ctrl-C to stop sharing.'
exec "$HOME/.local/bin/cloudflared" tunnel --config "$HOME/.local/share/localhost-preview/config.yml" --no-autoupdate \
  --url "http://127.0.0.1:$port" --http-host-header "localhost:$port"
WRAPPER
chmod 755 "$HOME/.local/bin/localhost-preview"
for profile in "$HOME/.zprofile" "$HOME/.zshrc"; do
  if ! grep -qF '# localhost-preview PATH' "$profile" 2>/dev/null; then
    printf '\n# localhost-preview PATH\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$profile"
  fi
done
"$HOME/.local/bin/cloudflared" --version
echo 'Installed. In a new terminal, run: localhost-preview 5173'
