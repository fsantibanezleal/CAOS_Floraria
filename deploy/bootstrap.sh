#!/usr/bin/env bash
# Legacy VPS tooling: preserved for the historical deployment, never used by Pages CI.
# Server-only, explicit first-time domain bootstrap. Requires an operator with root privileges.
set -Eeuo pipefail
domain="${1:-}"
email="${2:-}"
[[ "$domain" =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ && "$domain" != *..* ]] || { echo 'Provide a plain public domain.' >&2; exit 2; }
[[ "$email" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || { echo 'Provide a valid certificate contact email.' >&2; exit 2; }
[[ "$EUID" == 0 ]] || { echo 'Run this server bootstrap as root.' >&2; exit 2; }
command -v nginx >/dev/null
command -v certbot >/dev/null
command -v python3 >/dev/null
exec 9>"/var/lock/floraria-$domain.lock"
flock -n 9 || { echo 'Another Floraria release operation holds the domain lock.' >&2; exit 2; }
base="/var/www/$domain"
config="/etc/nginx/sites-available/$domain"
enabled="/etc/nginx/sites-enabled/$domain"
[[ ! -e "$config" && ! -L "$config" && ! -e "$enabled" && ! -L "$enabled" ]] || { echo 'A domain configuration path already exists; inspect it instead of overwriting.' >&2; exit 2; }
[[ ! -e "$base" && ! -L "$base" ]] || { echo 'The proposed site root already exists; inspect it before bootstrapping.' >&2; exit 2; }
nginx -t
nginx_configuration="$(nginx -T 2>/dev/null)"
if grep -E "server_name[^;]*[[:space:]]${domain//./\.}([[:space:];])" <<<"$nginx_configuration" >/dev/null; then
  echo 'An existing server block already claims this hostname.' >&2
  exit 2
fi
mkdir -p "$base/releases"
# Exclusive creation also closes the gap between checking and opening the configuration.
set -o noclobber
cat >"$config" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $domain;
    root $base/current;
    index index.html;
    server_tokens off;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header X-Frame-Options DENY always;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    location = /release.json {
        expires -1;
        try_files \$uri =404;
    }
    location /assets/ {
        expires 1y;
        try_files \$uri =404;
    }
    location /data/ {
        expires 5m;
        try_files \$uri =404;
    }
    location /manifests/ {
        expires -1;
        try_files \$uri =404;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
        expires -1;
    }
}
EOF
set +o noclobber
ln -s "$config" "$enabled"
if ! nginx -t; then
  rm -f -- "$enabled" "$config"
  echo 'nginx validation failed; removed only the new configuration.' >&2
  exit 1
fi
systemctl reload nginx
certbot --nginx --non-interactive --agree-tos --email "$email" --redirect -d "$domain"
nginx -t
systemctl reload nginx
printf 'HTTPS domain bootstrapped: %s. Install the verified immutable release next.\n' "$domain"
