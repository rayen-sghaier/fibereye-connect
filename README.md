# FIBEREYE CONNECT

Website + product boutique + secure admin dashboard for FIBEREYE CONNECT.

## Local run

```bash
npm install
npm run build
npm run start
```

Open:

- Client site: `http://127.0.0.1:5174/`
- Admin: `http://127.0.0.1:5174/#fibereye-admin`

Default admin code: `94239300`

## After installation

1. Open the admin page.
2. Go to settings.
3. Change the admin code.
4. Add real products and images.

## Data

Local data is stored in:

- `data/db.json`
- `data/uploads`
- `data/backups`

The `data/` folder is ignored by Git so client requests and uploads are not published.

## Reset admin code

```bash
npm run admin:reset -- 12345678
```

Then restart the server.

## Deployment

See [DEPLOY.md](DEPLOY.md).

Current Render config is free and does not require a credit card.

For saved products, requests, settings, and uploaded images on the free plan, connect Supabase. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
