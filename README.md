# FIBEREYE CONNECT

Site vitrine + boutique + dashboard admin sécurisé pour FIBEREYE CONNECT.

## Lancement local

```bash
npm install
npm run build
npm run start
```

Ouvrir ensuite:

- Site client: http://127.0.0.1:5174/
- Admin: http://127.0.0.1:5174/#fibereye-admin

Code admin par défaut: `94239300`

## Après installation

1. Connectez-vous à l'admin.
2. Allez dans `Paramètres`.
3. Changez le `Nouveau code admin`.
4. Ajoutez vos vrais produits avec images.

## Données

Les données réelles sont stockées dans:

- `data/db.json`: produits, demandes, paramètres et code admin hashé.
- `data/uploads`: images produits uploadées depuis l'admin.
- `data/backups`: sauvegardes créées depuis l'admin ou le terminal.

Le dossier `data/` est ignoré par Git pour ne pas publier les demandes clients.

## Réinitialiser le code admin

Si le code admin est oublié:

```bash
npm run admin:reset -- 12345678
```

Puis relancer le serveur.

## Export, backup et maintenance

Depuis l'admin, ouvrez `Backend` pour:

- exporter les demandes clients en CSV;
- créer un backup dans `data/backups`;
- nettoyer les images uploadées qui ne sont plus utilisées par les produits.

Depuis le terminal:

```bash
npm run backup
```

Le serveur expose aussi un endpoint de santé:

```text
GET /api/health
```

## Déploiement réel

Voir [DEPLOY.md](DEPLOY.md).

Fichiers prêts:

- `render.yaml` pour Render avec disque persistant.
- `Dockerfile` pour Docker/VPS.
- `.env.example` pour les variables production.
