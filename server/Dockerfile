# The Django API.
#
# Build context is server/, so BASE_DIR inside the container is /app and the
# paths settings.py already computes — /app/media, /app/staticfiles — line up
# with the volumes compose mounts there.
#
# python:3.14-slim matches the interpreter the project is developed on (see
# requirements.txt: psycopg 3 is pinned partly because psycopg2-binary has no
# 3.14 wheels). -slim, not -alpine: Alpine uses musl, which has no manylinux
# wheels, so Pillow, psycopg and argon2-cffi would all compile from source.

FROM python:3.14-slim

# PYTHONUNBUFFERED matters in a container: without it Python block-buffers
# stdout when it is a pipe, and `docker compose logs` shows nothing at all
# until the buffer fills — which looks exactly like a hung process.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Requirements first, source second. Docker caches layers, so this ordering
# means a code change reuses the installed-dependencies layer instead of
# reinstalling Django, Pillow and psycopg on every deploy.
COPY requirements.txt requirements.prod.txt ./
RUN pip install --no-cache-dir -r requirements.prod.txt

COPY glaze/ /app/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Run as a non-root user. If the application is ever exploited, the attacker
# lands as `app` rather than as root inside the container.
#
# The UID is pinned to 1000 because /app/media is a named volume shared with
# nginx: Docker chowns a fresh volume to the mount point's owner on first use,
# and an unpinned UID would change under the volume on a rebuild, leaving
# uploads unwritable.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && useradd --uid 1000 --create-home --shell /bin/bash app \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app

USER app

EXPOSE 8000

# A TCP connect, not an HTTP request. It answers the only question a
# healthcheck should ask here — "is gunicorn accepting connections" — without
# depending on ALLOWED_HOSTS, the database, or a URL that might start
# returning 500s for reasons unrelated to the process being alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import socket; socket.create_connection(('127.0.0.1', 8000), 4).close()"

ENTRYPOINT ["entrypoint.sh"]

# Workers: 2×cores+1 is the usual starting point, but this is a marketing site
# on a small VPS, and each worker is a full copy of Django in memory (~120 MB
# here). Three is the default; raise GUNICORN_WORKERS in .env if the box is
# bigger. The timeout is above EMAIL_TIMEOUT (15s) and CHAT_TIMEOUT_SECONDS
# (15s) so gunicorn never kills a worker that is legitimately waiting on the
# SMTP relay or an LLM provider.
CMD ["sh", "-c", "gunicorn glaze.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers ${GUNICORN_WORKERS:-3} \
    --timeout ${GUNICORN_TIMEOUT:-60} \
    --graceful-timeout 30 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    
    --access-logfile - \
    --error-logfile - \
    --capture-output"]
