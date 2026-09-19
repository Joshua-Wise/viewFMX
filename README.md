# viewFMX

viewFMX is an at-a-glance calendar view web app that makes use of the FMX API for event data.

![screenshot](https://github.com/Joshua-Wise/viewFMX/blob/main/screenshots/mockup.png?raw=true)

## Features

- Displays current and upcoming events
- Settings for building and resource selection
- Inspirational meeting quotes
- Responsive design for various display sizes

## Docker deployment

The images are built in CI, not on the host. Every push to `main` runs
`.github/workflows/build.yml`, which builds two images and pushes them to GHCR:

| Image | Contents |
| --- | --- |
| `ghcr.io/joshua-wise/viewfmx` | nginx serving the compiled SPA, proxying `/api/v1/` to FMX |
| `ghcr.io/joshua-wise/viewfmx-api` | the Express `/device/v1/` service for ESP32 / embedded clients |

Each is tagged with the short commit SHA plus `latest`. The workflow's last step
rewrites both tags in `docker-compose.yml` and commits that back to `main` as
`github-actions[bot]` with `[skip ci]`.

**That commit is the deploy.** Arcane watches this repo and syncs
`docker-compose.yml`, so the tags in that file are the version running in
production. To roll back, commit an older SHA tag on those lines.

### Running it by hand

On a host Arcane does not manage, you only need `docker-compose.yml` and a
`.env` beside it — no source checkout, no build step:

```bash
cp .env.example .env      # fill in your real FMX token and domain
docker compose pull
docker compose up -d
# → http://your-ip:3000   (UI_PORT in .env changes the host port)
```

The images are private by default, so `docker compose pull` needs a GHCR login
with `read:packages` unless the packages are made public:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin
```

Containers come up as `viewfmx-ui` and `viewfmx-api` under the `viewfmx`
project, regardless of the directory the compose file sits in.

### Configuration

`.env` is git-ignored and is never baked into an image. Copy `.env.example` and
fill in:

```
GOFMX_TOKEN=your_token
NGINX_PROXY_PASS=https://your-domain.gofmx.com/api/v1/
NGINX_PROXY_HOST=your-domain.gofmx.com
UI_PORT=3000
```

`GOFMX_TOKEN`, `NGINX_PROXY_PASS` and `NGINX_PROXY_HOST` are read at container
start and substituted into `nginx.conf` by `docker/docker-entrypoint.sh`.

The two `VITE_*` values (`VITE_API_BASE_URL`, `VITE_GOFMX_STATUS`) are compiled
into the SPA bundle at build time, so for the published image they come from
this repo's **Settings → Secrets and variables → Actions → Variables**, not from
`.env`. Both fall back to the defaults in `src/services/gofmxService.js`
(`/api/v1` and `FinalizedUpcoming`) when unset, so you only need to add them if
you want different values.

## Development

Requires Node.js v16+ and FMX API access.

```bash
git clone https://github.com/joshua-wise/viewFMX.git
cd viewFMX
npm install
cp .env.example .env    # fill in your token and domain
npm run dev
```

## Access & Use

Visit your-ip:3000 in a web browser | select building and resource

### iOS 9.3.5 Compatibility

For older iPads running iOS 9.3.5 that show "Browser not supported" errors, use the legacy-compatible version:

- **Modern browsers**: `http://your-ip:3000/` (default)
- **iOS 9.3.5 and older**: `http://your-ip:3000/ios9`

The iOS 9 compatible version provides the same functionality using vanilla JavaScript and polyfills. See [iOS9_COMPATIBILITY.md](iOS9_COMPATIBILITY.md) for detailed information.

## Notice

This project is not an official FMX product and is developed independently. I am not affiliated with or employed by FMX. It is provided "as-is" with no warranty or guarantee of functionality.
