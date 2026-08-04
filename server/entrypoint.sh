#!/bin/sh
#
# Runs before gunicorn on every container start.
#
# ⚠ This file must have LF line endings. It is authored on Windows, and a
# CRLF shebang makes the kernel look for an interpreter called "/bin/sh\r",
# which fails with the famously unhelpful "no such file or directory" —
# naming a file that plainly exists. .gitattributes pins it to LF, and the
# Dockerfile strips CR as a second line of defence.

set -e

# ── Wait for PostgreSQL ────────────────────────────────────────────────
#
# compose's `depends_on: condition: service_healthy` already covers the first
# boot. This loop covers the rest: a `docker compose restart`, a host reboot
# where both containers come up together, or Postgres restarting under the
# API. Without it those cases produce a crash-loop of "connection refused"
# that looks like a configuration error and is only a race.
echo "→ waiting for postgres at ${DB_HOST:-db}:${DB_PORT:-5432}"
attempts=0
until python - <<'PY'
import os, sys
import psycopg

try:
    psycopg.connect(
        host=os.environ.get('DB_HOST', 'db'),
        port=os.environ.get('DB_PORT', '5432'),
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        connect_timeout=3,
    ).close()
except Exception as exc:              # noqa: BLE001 — any failure means "not ready"
    print(f'   not ready: {exc}', file=sys.stderr)
    sys.exit(1)
PY
do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
        echo "✗ postgres did not become reachable after 60s — giving up." >&2
        echo "  Check: docker compose logs db" >&2
        exit 1
    fi
    sleep 2
done
echo "✓ postgres reachable"

# ── Migrations ─────────────────────────────────────────────────────────
#
# Run on start rather than as a separate deploy step, so a deploy cannot ship
# code that expects a column the database does not have yet.
#
# ⚠ This is safe because exactly ONE api container runs. Scale the service to
# two and both would migrate concurrently; move this to a one-shot job first.
#
# The first migration on a fresh database issues CREATE EXTENSION for pg_trgm
# and unaccent (chatbot/migrations/0001_initial.py). Both are trusted
# extensions on PostgreSQL 13+, and the compose database role owns its
# database, so this needs no manual psql step.
echo "→ applying migrations"
python manage.py migrate --noinput

# ── Static files ───────────────────────────────────────────────────────
#
# This is Django's OWN static — the /django-admin/ stylesheets — not the
# React build. The SPA is a separate image served by nginx.
#
# No --clear: the target is a shared volume nginx reads from, and clearing it
# would blank the admin's CSS for the seconds between wipe and rewrite.
echo "→ collecting static files"
python manage.py collectstatic --noinput --verbosity 0

echo "→ starting: $*"
exec "$@"
