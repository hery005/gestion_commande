# Gestion de commande

Application web permettant aux utilisateurs de gérer leurs commandes, fournisseurs, produits, stocks, factures et paiements. L'interface React et l'API Django sont conçues pour être déployées ensemble.

## Technologies

- Frontend : React, Vite et Axios
- Backend : Django REST Framework et JWT
- Développement local : MySQL
- Hébergement Railway : PostgreSQL

## Développement local

Installer les dépendances du frontend avec `cd frontend; npm ci`, puis démarrer Vite avec `npm run dev`. Le proxy `/api` de Vite transmet les requêtes à Django sur `127.0.0.1:8000`.

Configurer et démarrer Django depuis `backend/config` avec l'environnement Python du projet, puis appliquer les migrations avec `python manage.py migrate`. L'API est disponible sous `/api/`.

En production, les e-mails transactionnels utilisent `django-anymail` avec l'API HTTPS Brevo. Configurer `BREVO_API_KEY` et `DJANGO_DEFAULT_FROM_EMAIL` (adresse vérifiée dans Brevo) dans l'environnement du backend. En développement, Django utilise par défaut le backend console.

## Déploiement

Le Dockerfile à la racine construit le frontend et le sert avec Django. Pour créer le service PostgreSQL, configurer les variables Railway et lancer le premier déploiement, suivre le [guide Railway](./RAILWAY.md).
