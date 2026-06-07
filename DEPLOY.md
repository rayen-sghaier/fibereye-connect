# Déploiement réel

Le site est prêt pour un hébergement Node.js avec données persistantes.

## Option recommandée: Render

1. Créez un compte Render.
2. Mettez le projet dans GitHub.
3. Créez un `Web Service`.
4. Render détectera `render.yaml`.
5. Ajoutez la variable secrète `ADMIN_PASSWORD`.
6. Ajoutez votre domaine dans Render.
7. Changez le DNS du domaine vers Render.

Render fournit HTTPS automatiquement.

Important: le disque Render est configuré sur `/var/data`, donc les demandes, images et backups restent persistants.

## Option VPS

Sur Ubuntu:

```bash
sudo apt update
sudo apt install -y nodejs npm nginx
git clone YOUR_REPO_URL fibereye-connect
cd fibereye-connect
npm ci
npm run build
ADMIN_PASSWORD="votre-code-admin" NODE_ENV=production HOST=127.0.0.1 PORT=5174 npm run start
```

Ensuite, mettez Nginx devant Node avec HTTPS.

Exemple Nginx:

```nginx
server {
  server_name votre-domaine.com;

  location / {
    proxy_pass http://127.0.0.1:5174;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Puis installez SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## Données à sauvegarder

Sauvegardez toujours:

- `data/db.json`
- `data/uploads`
- `data/backups`

Commande manuelle:

```bash
npm run backup
```
