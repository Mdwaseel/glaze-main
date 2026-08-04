#!/usr/bin/env bash
#
# Deploy the current main branch. Run ON THE SERVER:
#
#     cd /srv/glaze && ./deploy/deploy.sh
#
# Idempotent — running it twice with nothing new to pull is a no-op that still
# verifies the site is up. Migrations and collectstatic are NOT here; they run
# in the api container's entrypoint, so they cannot be skipped by deploying a
# different way.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

say()  { printf '\n\033[1;36m→ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -f "$ROOT/.env" ] || fail ".env not found in $ROOT. Copy .env.example and fill it in."

# Read DOMAIN for the smoke tests below without exporting the whole file.
DOMAIN="$(grep -E '^DOMAIN=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
DOMAIN="${DOMAIN:-glazewindowsystems.com}"

# ── 1. Fetch ───────────────────────────────────────────────────────────
# --ff-only, never a merge. If the server's checkout has diverged, that is
# something to look at by hand — a deploy script that silently merges is a
# deploy script that ships a conflict resolution nobody reviewed.
say "Pulling latest code"
BEFORE="$(git rev-parse HEAD)"
git pull --ff-only
AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ]; then
    echo "  Already at $(git rev-parse --short HEAD) — rebuilding anyway."
else
    echo "  $(git rev-parse --short "$BEFORE") → $(git rev-parse --short "$AFTER")"
    git --no-pager log --oneline "$BEFORE..$AFTER" | sed 's/^/    /'
fi

# ── 2. Build ───────────────────────────────────────────────────────────
# Built before anything is stopped, so a build that fails leaves the running
# site untouched.
say "Building images"
docker compose build

# ── 3. Restart ─────────────────────────────────────────────────────────
# Only services whose image or config actually changed are recreated;
# PostgreSQL is normally left running.
say "Starting services"
docker compose up -d --remove-orphans

# ── 4. Wait for the API ────────────────────────────────────────────────
# The api container runs migrations before gunicorn binds, so "healthy" here
# means migrations succeeded too.
say "Waiting for the API to become healthy"
for i in $(seq 1 60); do
    status="$(docker inspect --format '{{.State.Health.Status}}' \
              "$(docker compose ps -q api)" 2>/dev/null || echo starting)"
    [ "$status" = "healthy" ] && break
    if [ "$status" = "unhealthy" ] || [ "$i" -eq 60 ]; then
        docker compose logs --tail 60 api
        fail "API did not come up (status: $status)"
    fi
    sleep 2
done
ok "API healthy"

# ── 5. Smoke tests ─────────────────────────────────────────────────────
# Cheap, and they catch the failures that a green `docker compose ps` does
# not: a config that serves index.html for robots.txt, an expired
# certificate, a 500 from a migration that applied but broke a query.
say "Verifying the live site"
check() {
    local url="$1" expect="$2" label="$3"
    local code
    code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo 000)"
    if [ "$code" = "$expect" ]; then
        ok "$label ($code)"
    else
        fail "$label returned $code, expected $expect — $url"
    fi
}

check "https://www.${DOMAIN}/"            200 "homepage"
check "https://www.${DOMAIN}/robots.txt"  200 "robots.txt"
check "https://www.${DOMAIN}/sitemap.xml" 200 "sitemap.xml"
check "https://www.${DOMAIN}/api/v1/catalogue/" 200 "catalogue API"

# The crawler files come from Django. If nginx answered them with the SPA
# fallback instead they would still be 200 — and silently useless, because a
# crawler handed HTML at robots.txt discards the file. Check the body.
say "Checking the crawler files are Django's, not the SPA fallback"
if curl -fsS --max-time 15 "https://www.${DOMAIN}/robots.txt" | head -1 | grep -qi '^User-agent:'; then
    ok "robots.txt is the real file"
else
    fail "robots.txt is being served by the SPA fallback — check the regex location in deploy/nginx/app.conf"
fi

# ── 6. Tidy ────────────────────────────────────────────────────────────
# Dangling images only. Not `-a`, which would delete the base images every
# rebuild and turn a 2-minute deploy into a 10-minute one.
say "Pruning dangling images"
docker image prune -f >/dev/null

docker compose ps
ok "Deployed $(git rev-parse --short HEAD)"
