# Deploy FIBEREYE CONNECT

This project is configured for a free Render deploy without a credit card.

## Free Render deploy

1. Push the project to GitHub.
2. Open Render and choose `New +`.
3. Choose `Blueprint`.
4. Select the GitHub repo `rayen-sghaier/fibereye-connect`.
5. Render reads `render.yaml` automatically.
6. Add `ADMIN_PASSWORD` when Render asks for it.
7. Click deploy.

The app will use:

- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check: `/api/health`
- Node version: `22.12.0`

## Important free-plan limit

The free Render service does not keep local file changes forever.

That means admin uploads, request data, and product edits can be lost after restart, redeploy, or idle spin-down. It is good for testing and showing the website online, but not ideal for a real business backend.

## Real production options

For a stable real site, use one of these:

- Render paid service with persistent disk.
- VPS with a real disk.
- A database/storage service such as Supabase for products, requests, and images.

## Local run

```bash
npm install
npm run build
npm run start
```

Open:

- Site: `http://127.0.0.1:5174/`
- Admin: `http://127.0.0.1:5174/#fibereye-admin`

