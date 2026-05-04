# AivaLink Web Deployment

## Cloudflare Pages

The production frontend is a static Vite build deployed to Cloudflare Pages.

Required build variables:

- `VITE_API_URL`: HTTPS backend origin, for example `https://api.example.com`
- `VITE_WS_URL`: WSS backend origin, for example `wss://api.example.com`
- `VITE_CLIENT_METRICS_URL`: optional override for client performance metrics

Build:

```bash
npm ci --legacy-peer-deps
npm run lint
npm test
npm run build
```

Direct Pages deployment:

```bash
CLOUDFLARE_ACCOUNT_ID=<account-id> npx wrangler pages deploy dist --project-name=aivalink-web
```

Use the Cloudflare Pages Git integration instead of Direct Upload if you want Cloudflare to own builds from GitHub. Do not mix a Git-integrated production project with a separate Direct Upload project unless the project names make the ownership clear.
