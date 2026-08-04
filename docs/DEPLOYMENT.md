# Deploying Glaze to glazewindowsystems.com

Everything needed to take this repository from a local checkout to a live site
on a Docker VPS, and to keep it updated afterwards with one command.

Read [Before you start](#0-before-you-start) and
[Decide www or apex](#1-decide-www-or-apex) first. The rest is in order —
follow it top to bottom the first time.

---

## What you are deploying

Four containers on one host, defined in [`docker-compose.yml`](../docker-compose.yml):

```
                    :443 / :80
                        │
                ┌───────▼────────┐
                │      web       │  nginx
                │                │  serves the React build from disk,
                │                │  proxies everything Django owns
                └───┬────────┬───┘
       /api/v1/     │        │      /  /about  /systems  /products/*
       /django-admin/        │      /admin  /blog  …
       robots.txt            │      → index.html, React Router decides
       llms.txt              │
       sitemap.xml           │
                ┌───▼────┐   └── /assets/  /videos/  /frames/  …
                │  api   │       (static files, no Django involved)
                │ Django │
                │gunicorn│
                └───┬────┘
                    │
              ┌─────▼─────┐        ┌──────────┐
              │    db     │        │ certbot  │  renews TLS on a loop
              │PostgreSQL │        └──────────┘
              └───────────┘
```

**One origin.** The SPA and the API are served from the same hostname. That is
not cosmetic: it is what lets `VITE_API_URL` be the relative path `/api/v1`, it
removes CORS from the runtime picture, and it lets the authentication cookies
stay `SameSite=Lax` instead of the `SameSite=None` a cross-site split would
force.

**Only `web` is exposed.** PostgreSQL and gunicorn have no `ports:` entry, so
they are reachable only from inside the compose network.

| Path | Served by |
|---|---|
| `/`, `/about`, `/systems`, `/products/<slug>`, `/blog`, `/admin` | nginx → `index.html` → React Router |
| `/assets/`, `/videos/`, `/frames/`, `/images/` | nginx, straight from disk |
| `/api/v1/…` | Django |
| `/django-admin/` | Django (moved off `/admin/` so the Studio can have it) |
| `/robots.txt`, `/llms.txt`, `/sitemap.xml` | Django — generated from the live database |
| `/media/` | nginx, from the uploads volume |
| `/static/` | nginx — Django's admin CSS, not the SPA |

---

## 0. Before you start

**You need:**

- A VPS with Docker and the Compose plugin. **2 GB RAM minimum** — the
  frontend build is the peak, and 1 GB will be killed part-way through with a
  message that looks nothing like "out of memory". [Add swap](#not-enough-ram-for-the-build)
  if you are on 1 GB and cannot resize.
- **~6 GB free disk.** The images are large, mostly because the site ships
  311 MB of video and frame sequences.
- Control of the DNS for `glazewindowsystems.com`.
- The Gmail app password for `info@glazewindowsystems.com`.

**Check the VPS:**

```bash
docker --version && docker compose version
free -h && df -h /
```

If Docker is missing:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER    # then log out and back in
```

> **Rotate the mail password before launch.** The app password currently in
> `server/glaze/.env` was pasted into a chat during development. Revoke it at
> [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords),
> generate a new one, and put only the new one in the server's `.env`. There is
> no way to tell whether a leaked credential has been used, and it costs a
> minute to replace. The same applies to any Groq or Cerebras key that was
> shared the same way.

---

## 1. Decide: www or apex

**Pick one hostname and 301 the other.** Two hostnames serving identical pages
is one page indexed twice, competing with itself.

This codebase already commits to **`www.glazewindowsystems.com`**. It is
hardcoded in [`client/index.html`](../client/index.html) — the canonical tag,
`og:url`, and every JSON-LD `@id` — and it is the default of `SITE_ORIGIN` in
[`client/src/components/common/SEO/siteOrigin.js`](../client/src/components/common/SEO/siteOrigin.js).
Everything shipped here follows that.

**Keeping www** (recommended — nothing to change): the config in this repo
already redirects the apex to www.

**Moving to the apex** means changing all five of these *together*, or the site
will advertise one canonical while serving another:

1. every `https://www.glazewindowsystems.com` in `client/index.html`
2. the `SITE_ORIGIN` default in `siteOrigin.js`
3. `SITE_URL` and `VITE_SITE_URL` in `.env`
4. the redirect target and `server_name` blocks in [`deploy/nginx/app.conf`](../deploy/nginx/app.conf)
5. the canonical host in this document

The rest of this guide assumes **www**.

---

## 2. Put the project in git

This directory is not a repository yet. From the project root **on your local
machine**:

```bash
git init -b main
git add .
git status --short | head -30      # sanity-check what is about to be committed
```

**Before the first commit, confirm no secret is staged.** The
[`.gitignore`](../.gitignore) already excludes them, so this should print
nothing:

```bash
git status --short | grep -E '\.env$|\.env\.local|db\.sqlite3'
```

If it prints anything, stop and fix `.gitignore` — a secret committed once
stays in the history even after you delete the file.

```bash
git commit -m "Glaze site, API and deployment configuration"
git remote add origin git@github.com:YOUR-USER/glaze.git
git push -u origin main
```

### About the repository size

The commit is roughly **315 MB**, of which **311 MB is `client/public`** —
81 videos, 625 hero frame images, and the product photography. That is fine for
GitHub (the limits are 100 MB *per file*, and the largest here is 18 MB), but
two things follow:

- The first `git clone` on the VPS downloads all of it. Expect several minutes.
- Git stores every *version* of a binary forever. Replacing a 15 MB video ten
  times adds 150 MB to the history permanently, and it can never be shrunk
  without rewriting history.

If the videos start changing regularly, move them to
[Git LFS](https://git-lfs.com) *before* that happens, not after. As a one-time
upload of assets that rarely change, plain git is the simpler choice and this
setup uses it.

---

## 3. DNS

At your registrar, point both hostnames at the VPS:

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` | your VPS IPv4 | 300 |
| `A` | `www` | your VPS IPv4 | 300 |

Add `AAAA` records too if the VPS has IPv6 — nginx listens on both.

**Do the DNS first and wait for it to propagate.** Let's Encrypt validates by
fetching a file from this domain over HTTP; if DNS has not caught up, issuance
fails and repeated failures hit a rate limit (5 per hour per domain) that locks
you out for an hour.

Verify from somewhere that is not your own machine's cache:

```bash
dig +short www.glazewindowsystems.com @1.1.1.1
dig +short glazewindowsystems.com @1.1.1.1
```

Both must return your VPS IP before continuing.

---

## 4. Prepare the VPS

SSH in as root, then create a non-root user to run the deployment:

```bash
adduser deploy
usermod -aG docker,sudo deploy
rsync -a --chown=deploy:deploy ~/.ssh /home/deploy/
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

> **ufw does not restrain Docker.** Docker writes its own iptables rules that
> bypass ufw entirely, so any container with a published port is reachable from
> the internet regardless of what ufw says. This is why `db` and `api` have no
> `ports:` entry in `docker-compose.yml` — that, not the firewall, is what
> keeps PostgreSQL off the public internet. Do not add a `ports:` line to
> either service.

---

## 5. Clone and configure

As the `deploy` user:

```bash
sudo mkdir -p /srv/glaze && sudo chown deploy:deploy /srv/glaze
git clone git@github.com:YOUR-USER/glaze.git /srv/glaze
cd /srv/glaze
chmod +x deploy/*.sh
```

Create the environment file:

```bash
cp .env.example .env
```

Generate the two secrets you need:

```bash
# SECRET_KEY — a NEW one, not the development key
docker run --rm python:3.14-slim python -c \
  "import secrets,string; a=string.ascii_letters+string.digits+'!@#%^&*(-_=+)'; print(''.join(secrets.choice(a) for _ in range(50)))"

# DB_PASSWORD — no '$', which compose would interpolate
openssl rand -base64 36 | tr -d '/+=$'
```

Now edit `.env`. Every field is documented inline in
[`.env.example`](../.env.example); these are the ones that must change:

| Setting | Value |
|---|---|
| `SECRET_KEY` | the generated key |
| `DEBUG` | `False` — never anything else |
| `ALLOWED_HOSTS` | `glazewindowsystems.com,www.glazewindowsystems.com,127.0.0.1,localhost` |
| `DB_PASSWORD` | the generated password |
| `CORS_ALLOWED_ORIGINS` | both `https://` origins — **see the warning below** |
| `SITE_URL` | `https://www.glazewindowsystems.com` |
| `EMAIL_HOST_PASSWORD` | the freshly rotated Gmail app password |
| `NGINX_CONF` | **`bootstrap.conf`** for now — you will switch it in step 7 |
| `GLAZE_ADMIN_EMAIL` / `GLAZE_ADMIN_PASSWORD` | temporarily, for step 8 |

> **`CSRF_TRUSTED_ORIGINS` is derived from `CORS_ALLOWED_ORIGINS`**
> ([`settings.py`](../server/glaze/glaze/settings.py), last line). Even though
> the SPA and API share an origin and CORS is barely involved, **the public
> origin must be listed there** — otherwise every POST from the Studio fails
> CSRF verification and nobody can log in. This is the single most common way
> this stack comes up "working" but with an unusable admin panel.

Lock the file down:

```bash
chmod 600 .env
```

---

## 6. First boot, without TLS

The certificate does not exist yet, and nginx refuses to start with a missing
`ssl_certificate`. So the first boot runs an HTTP-only config that exists only
to serve the ACME challenge.

Confirm `.env` has `NGINX_CONF=bootstrap.conf`, then:

```bash
docker compose up -d --build
```

The first build takes **5–15 minutes**: it installs Python dependencies,
installs npm packages, and runs the Vite build over 311 MB of assets. Watch it:

```bash
docker compose logs -f
```

When it settles, check:

```bash
docker compose ps                     # db healthy, api healthy, web up
curl http://www.glazewindowsystems.com/healthz     # → ok
```

`curl http://www.glazewindowsystems.com/` returning **503 "awaiting TLS
certificate"** is correct at this stage — the bootstrap config deliberately
does not serve the site over plain HTTP, so nothing can be indexed at an
`http://` URL during the minutes before the certificate exists.

---

## 7. Get the certificate

```bash
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d glazewindowsystems.com \
  -d www.glazewindowsystems.com \
  --email info@glazewindowsystems.com \
  --agree-tos --no-eff-email
```

> **`--entrypoint certbot` is required, not decoration.** The compose service
> overrides the image's entrypoint with the twice-daily renewal loop. Without
> this flag your `certonly …` arguments are handed to that loop as positional
> parameters, which ignores them — the command appears to succeed, sits there,
> and no certificate is ever issued.

One certificate covers both names. The **apex is listed first on purpose**: the
first `-d` names the directory the certificate lands in, and
`deploy/nginx/app.conf` expects
`/etc/letsencrypt/live/glazewindowsystems.com/`.

> **Test first if you are unsure.** Add `--dry-run` to rehearse against the
> staging environment. Let's Encrypt allows 5 failed authorisations per hour
> per hostname, and burning that limit means waiting an hour.

Then switch to the real configuration:

```bash
sed -i 's/^NGINX_CONF=.*/NGINX_CONF=app.conf/' .env
docker compose up -d web
```

Verify:

```bash
curl -I https://www.glazewindowsystems.com/
curl -I http://www.glazewindowsystems.com/          # → 301 to https
curl -I https://glazewindowsystems.com/             # → 301 to www
```

Renewal is automatic — the `certbot` service checks twice daily and `web`
reloads every six hours to pick up a new certificate. Neither needs downtime,
because certbot writes its challenge into a volume nginx already serves.

---

## 8. Seed the data

Migrations ran automatically when the `api` container started
([`server/entrypoint.sh`](../server/entrypoint.sh)). The database is empty
otherwise.

```bash
# Studio administrator. Reads GLAZE_ADMIN_EMAIL / GLAZE_ADMIN_PASSWORD from
# .env, so the password never appears in a shell command or in history.
docker compose exec api python manage.py bootstrap_admin

# The seven systems and their variants
docker compose exec api python manage.py seed_catalogue

# Blog starter content — skip if you will write posts in the Studio
docker compose exec api python manage.py seed_blog

# The site assistant's knowledge base. ⚠ Run this AFTER seed_catalogue: it is
# built from catalogue and blog content, and an empty corpus means the
# assistant refuses every question.
docker compose exec api python manage.py build_knowledge
```

**Now blank the admin credentials in `.env`** — the account exists in the
database from here on, and a live password has no reason to sit in a file:

```bash
sed -i 's/^GLAZE_ADMIN_EMAIL=.*/GLAZE_ADMIN_EMAIL=/;s/^GLAZE_ADMIN_PASSWORD=.*/GLAZE_ADMIN_PASSWORD=/' .env
```

`bootstrap_admin` is idempotent — re-run it with `--email` and `--password`
flags any time you are locked out.

### Nightly analytics roll-up

Raw page views are folded into daily totals and then pruned. Without this the
`PageView` table grows without limit.

```bash
crontab -e
```

```cron
15 3 * * * cd /srv/glaze && docker compose exec -T api python manage.py rollup_analytics >> /var/log/glaze-rollup.log 2>&1
30 3 * * * cd /srv/glaze && ./deploy/backup.sh >> /var/log/glaze-backup.log 2>&1
```

---

## 9. Verify the deployment

```bash
# Pages
curl -sI https://www.glazewindowsystems.com/ | head -1
curl -s  https://www.glazewindowsystems.com/ | grep -o '<title>.*</title>'

# Crawler files — must be Django's, not the SPA fallback
curl -s https://www.glazewindowsystems.com/robots.txt  | head -3
curl -s https://www.glazewindowsystems.com/sitemap.xml | head -3
curl -s https://www.glazewindowsystems.com/llms.txt    | head -3

# API
curl -s https://www.glazewindowsystems.com/api/v1/catalogue/ | head -c 200
```

**The most important check:** `robots.txt` must begin with `User-agent:`. If it
returns HTML, nginx is answering it with `index.html` — the request never
reached Django — and a crawler handed HTML at that path discards the file
silently. `deploy/deploy.sh` asserts this on every deploy for exactly that
reason.

Then, in a browser:

- [ ] Homepage renders, hero video plays, systems carousel scrolls
- [ ] The Systems dropdown in the navbar lists every published system
- [ ] `/products/<slug>` loads and the variant selector works
- [ ] Submit a contact enquiry → it appears in the Studio **and** arrives by email
- [ ] `/admin` login works — **this is what a wrong `CORS_ALLOWED_ORIGINS` breaks**
- [ ] Upload an image in the Studio, confirm it renders on the public site
- [ ] `/django-admin/` loads *with its stylesheets* (that is `collectstatic` and the `/static/` location working)
- [ ] A made-up URL like `/nope` shows the 404 page, not a blank screen

Finally, submit `https://www.glazewindowsystems.com/sitemap.xml` in Google
Search Console and Bing Webmaster Tools. Put their verification tokens into
**Studio › Site settings › Search engine verification** — they render into the
page head with no redeploy.

---

## 10. The update loop

Day to day, this is the whole thing:

```bash
# On your machine
git add -A
git commit -m "Update the casement system copy"
git push
```

```bash
# On the VPS
cd /srv/glaze && ./deploy/deploy.sh
```

[`deploy/deploy.sh`](../deploy/deploy.sh) pulls, rebuilds, restarts, waits for
the API to report healthy, and then runs the smoke tests from step 9. It builds
*before* it stops anything, so a build that fails leaves the running site
untouched.

**What needs which action:**

| You changed | What to run | Why |
|---|---|---|
| React components, CSS, `client/public` assets | `./deploy/deploy.sh` | Rebuilds the `web` image |
| Python code, models, serializers | `./deploy/deploy.sh` | Rebuilds `api`; migrations run on start |
| `deploy/nginx/*.conf` | `docker compose restart web` | Bind-mounted — no rebuild needed |
| `.env`, Django values | `docker compose up -d api` | Recreates the container with new env |
| `.env`, any `VITE_*` value | `docker compose up -d --build web` | **Baked into the bundle at build time** |
| Site content, contact details, systems, blog, pixel IDs | *nothing* | Edited in the Studio, read from the database at runtime |

That last row is most of what changes on a live site. Phone numbers, recipient
addresses, systems, variants, blog posts, the Meta Pixel ID and the
verification tokens are all database-backed — there is no deploy involved.

### Database changes

Adding a model or a field means a migration, and it must be generated locally
and committed, never generated on the server:

```bash
# Locally
cd server/glaze
python manage.py makemigrations
python manage.py migrate            # test it against your own database
git add . && git commit -m "Add …" && git push
```

The server applies it on the next deploy, automatically, before gunicorn
starts. **Take a backup first if the migration deletes or renames a column** —
`./deploy/backup.sh` takes about a second and a reversed migration does not
bring data back.

---

## 11. Automatic deploys (optional)

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) makes a push
to `main` deploy itself. It lints and builds the frontend first, and only
deploys if that passed, so a broken import cannot take the site down.

Generate a key pair used **for nothing else**:

```bash
ssh-keygen -t ed25519 -C github-deploy -f ~/glaze_deploy_key -N ""
ssh-copy-id -i ~/glaze_deploy_key.pub deploy@YOUR_VPS_IP
ssh-keyscan -t ed25519 YOUR_VPS_IP        # for the host key secret below
```

Add four repository secrets (**Settings › Secrets and variables › Actions**):

| Secret | Value |
|---|---|
| `VPS_HOST` | the VPS IP or hostname |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | contents of `~/glaze_deploy_key` — the **private** half, whole file |
| `VPS_SSH_HOST_KEY` | the `ssh-keyscan` output line |

> Do not reuse your personal SSH key. Anyone who can push to this repository —
> or anyone who compromises a GitHub Action — can then run commands as you on
> every machine that trusts it. And pin `VPS_SSH_HOST_KEY` rather than running
> `ssh-keyscan` inside the workflow: scanning at deploy time trusts whatever
> answers on the day, which is exactly the interception that host keys exist to
> prevent.

Delete `~/glaze_deploy_key` from your machine once it is in GitHub.

---

## 12. Operations

```bash
# Logs
docker compose logs -f api                # Django + gunicorn
docker compose logs -f web                # nginx access and error
docker compose logs --tail 100 certbot    # renewal history

# Shells
docker compose exec api python manage.py shell
docker compose exec db psql -U glaze -d glaze_db

# Any management command
docker compose exec api python manage.py <command>

# Restart one service / everything
docker compose restart web
docker compose up -d

# Disk
docker system df
docker image prune -f
```

### Restore from a backup

```bash
# Database — drops and recreates the schema, so it is a real restore, not a merge
docker compose stop api
docker compose exec -T db pg_restore -U glaze -d glaze_db --clean --if-exists \
  < deploy/backups/db-YYYYMMDD-HHMMSS.dump
docker compose start api

# Uploaded media
docker compose exec -T api tar -xz -C /app/media < deploy/backups/media-YYYYMMDD-HHMMSS.tar.gz
```

> **Test the restore before you need it.** An untested backup is a hypothesis.
> The cheap version: restore a dump onto a local machine and check the enquiry
> count matches.

### Maintenance mode

**Studio › Site settings › Maintenance mode** puts a notice on the public site
while leaving the admin panel reachable. Use it for anything longer than a
deploy — a data migration, a restore.

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `exec entrypoint.sh: no such file or directory` | CRLF line endings on a shell script | [`.gitattributes`](../.gitattributes) pins LF. If it happened anyway: `git add --renormalize . && git commit` |
| Infinite redirect loop on every page | Django can't tell the request was HTTPS | `X-Forwarded-Proto` must be set — it is, in [`snippets/proxy.conf`](../deploy/nginx/snippets/proxy.conf). Confirm nginx is using `app.conf`, not a hand-edited copy |
| Studio login fails with a CSRF error | Public origin missing from `CORS_ALLOWED_ORIGINS` | Add both `https://` origins, `docker compose up -d api` |
| `robots.txt` returns HTML | Request never reached Django | The regex `location` block in `app.conf` must come before the SPA fallback. It does — check `NGINX_CONF=app.conf` |
| Site works, uploaded images 404 | Media volume not mounted, or wrong `MEDIA_URL` | `docker compose exec web ls /srv/media` |
| `/django-admin/` unstyled | `collectstatic` did not reach the shared volume | `docker compose exec api python manage.py collectstatic --noinput` |
| Deploy succeeded, browser shows the old site | `index.html` was cached | `app.conf` sets `no-cache` on it. Hard-refresh once; if it persists, check for a CDN in front |
| `nginx: host not found in upstream "api"` | Old config resolving the upstream at startup | `app.conf` resolves it per request via Docker DNS — make sure you are on the shipped config |
| Enquiry saved but no email | SMTP credentials, or the app password was revoked | `docker compose logs api \| grep -i smtp`, then Studio › Contact settings › send a test |
| Certificate did not renew | Port 80 closed, or the ACME location was redirected | `curl http://www.glazewindowsystems.com/.well-known/acme-challenge/test` must not 301 |
| `docker compose` says port 80 in use | Host nginx/apache running | `sudo systemctl disable --now nginx apache2` |

### Not enough RAM for the build

The Vite build is the peak. On a 1 GB box it is killed with an error that does
not mention memory. Add swap:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Or build the `web` image somewhere with more memory and push it to a registry.

---

## 14. What this setup does not do

Stated plainly, so none of it is a surprise later.

| Not included | What it would take |
|---|---|
| **Per-page social previews** | This is a client-rendered SPA. Googlebot runs JavaScript, but Facebook, WhatsApp, LinkedIn and X do not — a link to `/products/casement` shared into WhatsApp shows the site-level card, not Casement's. No tag fixes this; it needs prerendering at build time. See the SEO section of the [README](../README.md). |
| **Zero-downtime deploys** | `docker compose up -d` replaces containers, so there is a few-second gap. Fixing it properly means two api containers and an nginx upstream that drains — worth it for a busy application, not for this. |
| **Off-site backups** | [`deploy/backup.sh`](../deploy/backup.sh) writes to the same disk as the data. A commented `rclone`/`s3 sync` line is at the bottom of it. **Do this** — it is the difference between an incident and a catastrophe. |
| **Uptime monitoring** | Nothing tells you the site is down. Point any free monitor at `/healthz`. |
| **Log rotation for Docker** | Container logs grow without limit. Add `log-driver: json-file` with `max-size` in `/etc/docker/daemon.json`. |
| **A staging environment** | The same compose file on a second host with `VITE_NOINDEX=true` and a different domain. The noindex support is already built in. |
| **Cookie consent banner** | Needed for EU/UK traffic *before* the Meta Pixel is switched on. The pixel field is deliberately blank, with that warning next to it in the Studio. |
| **Rollback** | `git revert` then redeploy. There is no image-tag rollback because images are not tagged per release — add `image: glaze-web:${GIT_SHA}` to `docker-compose.yml` if you want one. |

---

## Quick reference

```bash
cd /srv/glaze

./deploy/deploy.sh                        # deploy latest main
./deploy/backup.sh                        # database + media snapshot

docker compose ps                         # what is running
docker compose logs -f api                # Django logs
docker compose restart web                # after an nginx config change
docker compose up -d --build web          # after a VITE_* change
docker compose exec api python manage.py <cmd>
docker compose exec db psql -U glaze -d glaze_db
```
