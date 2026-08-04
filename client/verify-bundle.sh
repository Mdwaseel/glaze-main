#!/bin/sh
#
# Reject a frontend build whose API base URL is wrong.
#
# Run by the Dockerfile after `npm run build`, and safe to run by hand:
#
#     sh client/verify-bundle.sh client/dist
#
# WHY THIS EXISTS. services/api.js falls back to `http://localhost:8000/api/v1`
# when VITE_API_URL is absent, which is right in development and fatal in
# production: the site builds, deploys and renders perfectly, and then every API
# call goes to the visitor's own machine. The catalogue falls back to static
# data so the pages still LOOK fine — but the journal is empty, the Studio
# cannot log in, and enquiries silently fail. Nothing in the build output hints
# at it, which is what makes it worth a hard failure here.

set -e

DIST="${1:-dist}"
ASSETS="$DIST/assets"

if [ ! -d "$ASSETS" ]; then
    echo "✗ $ASSETS does not exist — did the build run?" >&2
    exit 1
fi

fail() {
    echo ""
    echo "✗ BUILD REJECTED: $1" >&2
    shift
    for line in "$@"; do echo "  $line" >&2; done
    echo ""
    exit 1
}

# 1. The development fallback reached production.
if grep -rq "localhost:8000" "$ASSETS"/*.js; then
    fail "the bundle contains a localhost API URL." \
         "VITE_API_URL did not reach Vite. Check the build args in" \
         "docker-compose.yml — it must be /api/v1 in production."
fi

# 2. MSYS2 path conversion mangled the value. Git Bash on Windows rewrites an
#    environment value that looks like a Unix path into a Windows one, turning
#    /api/v1 into C:/Program Files/Git/api/v1.
if grep -rqE "[A-Za-z]:/[^\"\`']*api/v1" "$ASSETS"/*.js; then
    fail "the API URL was rewritten to a Windows path." \
         "MSYS2 path conversion mangled a Unix-style value." \
         "Build from PowerShell, or prefix the command with MSYS_NO_PATHCONV=1."
fi

# 3. Positive assertion. The two checks above catch the failures seen so far;
#    this catches the ones that have not happened yet, by requiring that some
#    recognisable API base actually made it into the bundle.
if ! grep -rq "api/v1" "$ASSETS"/*.js; then
    fail "no API base URL found in the bundle at all." \
         "Expected VITE_API_URL (default /api/v1) to be inlined by Vite."
fi

echo "✓ bundle API URL verified"
