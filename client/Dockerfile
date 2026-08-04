# The React SPA, built once and then served as static files by nginx.
#
# This image is also the site's web server: nginx serves the build AND
# reverse-proxies everything that belongs to Django. Splitting them into a
# separate nginx service would mean copying dist/ between images or sharing a
# volume, both of which are more moving parts than one multi-stage build.

# ── Stage 1: build ─────────────────────────────────────────────────────
FROM node:24-alpine AS build

WORKDIR /app

# Lockfile first so a source-only change reuses the install layer.
# `npm ci` not `npm install`: ci installs exactly what package-lock.json says
# and fails if the two disagree, so a production build cannot silently pick up
# a different version of React than the one that was tested.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ⚠ Vite inlines env vars AT BUILD TIME. There is no runtime configuration for
# anything VITE_-prefixed — changing one of these means rebuilding this image,
# not restarting the container. That is why they are build args.
#
# VITE_API_URL is a RELATIVE path in production. The SPA and Django share one
# origin behind nginx, so /api/v1 is correct and also removes CORS from the
# picture entirely. services/api.js strips the /api/v1 suffix to derive the
# media origin, which yields '' — same origin — exactly as intended.
ARG VITE_API_URL=/api/v1
# The canonical origin for every canonical tag, og:url and JSON-LD @id.
# ⚠ Must agree with SITE_URL on the Django side and with the hardcoded origin
# in index.html, or the site advertises two canonicals for the same page.
ARG VITE_SITE_URL=https://www.glazewindowsystems.com
# Set to true for a staging build so it cannot be indexed. Blank in production.
ARG VITE_NOINDEX=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_NOINDEX=$VITE_NOINDEX

# Lint before build. A broken deploy caught in 4 seconds here is cheaper than
# one caught by a visitor.
RUN npm run lint && npm run build

# ⚠ THE SILENT DEPLOY KILLER, made loud.
#
# services/api.js falls back to `http://localhost:8000/api/v1` when
# VITE_API_URL is absent. That fallback is right for development and fatal in
# production: the site builds, deploys and renders perfectly, and then every
# API call goes to the VISITOR'S own machine. The catalogue falls back to
# static data so the pages still look fine — but the journal is empty, the
# Studio cannot log in, and enquiry submission fails. Nothing in the build
# output hints at it.
#
# The SECOND failure mode is not hypothetical — it happened while this file was
# being written. Git Bash / MSYS2 on Windows rewrites any environment value that
# LOOKS like a Unix path into a Windows one, so
#
#     VITE_API_URL=/api/v1 npm run build
#
# run from that shell bakes `C:/Program Files/Git/api/v1` into the bundle. The
# build succeeds, the localhost check passes, and every API call 404s. Docker
# builds on Linux and cannot hit it; a hand-run build on a developer's machine
# can, so the image refuses to carry the result either way.
#
# Both checks live in one script file rather than inline, because a `#` comment
# inside a line-continued RUN is parsed inconsistently and can silently swallow
# the command that follows it.
RUN sh verify-bundle.sh dist

# ── Stage 2: serve ─────────────────────────────────────────────────────
# Unpinned minor deliberately — the guide recommends pinning to a digest once
# the first deploy is verified, and a version that does not exist yet is a
# build failure with no upside.
FROM nginx:alpine

# The configuration is NOT copied in. docker-compose.yml bind-mounts it from
# deploy/nginx/, so an nginx change is `docker compose restart web` rather
# than a rebuild of a ~160 MB image — and so the TLS bootstrap can swap
# configs without touching the build at all.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/healthz || exit 1
