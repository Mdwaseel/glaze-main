#!/usr/bin/env bash
#
# Back up the database and the uploaded media. Run ON THE SERVER, nightly:
#
#     0 3 * * * cd /srv/glaze && ./deploy/backup.sh >> /var/log/glaze-backup.log 2>&1
#
# ⚠ Both of these exist in exactly one place. The database is a Docker volume
# and the uploads are another; `docker compose down -v` deletes both, and so
# does losing the VPS. Everything else — code, configuration, the seed data —
# is in git and can be rebuilt. These cannot.
#
# ⚠ A backup on the same disk as the thing it backs up is not a backup. Copy
# deploy/backups/ off the box (rclone, scp from elsewhere, object storage);
# the last section shows where to add that.

set -euo pipefail

cd "$(dirname "$0")/.."
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="deploy/backups"
KEEP_DAYS=14

mkdir -p "$DEST"

DB_NAME="$(grep -E '^DB_NAME=' .env | head -1 | cut -d= -f2- | tr -d '"')"
DB_USER="$(grep -E '^DB_USER=' .env | head -1 | cut -d= -f2- | tr -d '"')"

echo "→ dumping database $DB_NAME"
# Custom format (-Fc): compressed, and restorable selectively with pg_restore.
#
# Streamed to the host's stdout rather than written inside the container. The
# postgres image runs as uid 70, so a bind-mounted host directory would be
# unwritable to it and pg_dump would fail with a permission error that reads
# like a database fault. Redirecting here writes as the host user instead.
#
# -T disables TTY allocation. Without it docker injects carriage returns into
# the stream and the dump is corrupt in a way pg_restore only discovers later.
docker compose exec -T db \
    pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DEST/db-${STAMP}.dump"
echo "  $DEST/db-${STAMP}.dump ($(du -h "$DEST/db-${STAMP}.dump" | cut -f1))"

echo "→ archiving uploaded media"
# Read from the api container, which has the volume mounted. Streaming to
# stdout means no temporary copy inside the container.
docker compose exec -T api tar -cz -C /app/media . > "$DEST/media-${STAMP}.tar.gz"
echo "  $DEST/media-${STAMP}.tar.gz ($(du -h "$DEST/media-${STAMP}.tar.gz" | cut -f1))"

echo "→ pruning backups older than ${KEEP_DAYS} days"
find "$DEST" -name 'db-*.dump'      -mtime +${KEEP_DAYS} -print -delete
find "$DEST" -name 'media-*.tar.gz' -mtime +${KEEP_DAYS} -print -delete

# ── Off-site copy ──────────────────────────────────────────────────────
# Uncomment and configure ONE of these. Until you do, a failed disk loses
# every enquiry, every blog post and every uploaded image at once.
#
# rclone copy "$DEST" remote:glaze-backups --max-age 25h
# aws s3 sync "$DEST" s3://your-bucket/glaze/ --exclude '*' --include '*-'"$STAMP"'*'

echo "✓ backup complete: $STAMP"
