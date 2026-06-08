# Deploy FIBEREYE CONNECT

This project is configured for a free Render deploy without a credit card.

## Free Render deploy

1. Push the project to GitHub.
2. Open Render and choose `New +`.
3. Choose `Blueprint`.
4. Select the GitHub repo `rayen-sghaier/fibereye-connect`.
5. Render reads `render.yaml` automatically.
6. Add `ADMIN_PASSWORD` when Render asks for it.
7. Add Supabase variables if you want free persistent data.
8. Click deploy.

The app will use:

- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check: `/api/health`
- Node version: `22.12.0`

## Important free-plan limit

The free Render service does not keep local file changes forever.

Without Supabase, admin uploads, request data, and product edits can be lost after restart, redeploy, or idle spin-down.

With Supabase configured, products, requests, settings, admin code, and uploaded product images are stored outside Render.

## Real production options

For a stable real site, use one of these:

- Render paid service with persistent disk.
- VPS with a real disk.
- Supabase free plan for products, requests, settings, and images.

## Supabase

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Local run

```bash
npm install
npm run build
npm run start
```

Open:

- Site: `http://127.0.0.1:5174/`
- Admin: `http://127.0.0.1:5174/#fibereye-admin`
