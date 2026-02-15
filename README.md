# Backpacking

Application web Angular SSR pour préparer et explorer des voyages de backpacking.

## Fonctionnalités (aperçu)

- Cartographie interactive et affichage de marqueurs.
- Gestion/consultation de voyages et médias associés.
- Consommation d’API externes (météo) et d’une API backend.

## Démarrage local (dev)

```bash
npm install
npm run start
```

Ouvre `http://localhost:4200/`.

## Build SSR

```bash
npm run build
npm run serve:ssr:backpacking
```

Par défaut, le serveur SSR écoute sur `http://localhost:4001`.

## Déploiement Docker (runtime env)

L’image lit ses variables au démarrage (pas besoin de rebuild).

Variables supportées (runtime) :

- `BASE_API` : URL base pour les assets/back.
- `API_URL` : URL de l’API (ex: `https://api.example.com/api`).
- `MAP_TOKEN` : token Mapbox.
- `WEATHER_API_KEY` : clé météo.
- `PORT` : port d’écoute SSR (défaut `4001`).

### Exemple docker-compose

```yaml
services:
  web:
    image: ghcr.io/<owner>/<repo>:latest
    ports:
      - "4001:4001"
    environment:
      - PORT=4001
      - BASE_API=https://api.example.com
      - API_URL=https://api.example.com/api
      - MAP_TOKEN=pk.xxxxx
      - WEATHER_API_KEY=xxxxx
```

### Exemple .env

```dotenv
BASE_API=https://api.example.com
API_URL=https://api.example.com/api
MAP_TOKEN=pk.xxxxx
WEATHER_API_KEY=xxxxx
```

## Ajouter une variable d’environnement à l’avenir

1) Ajouter la clé dans le runtime:
- `scripts/runtime-env.mjs` : ajouter la variable dans `runtimeEnv`.

2) Exposer la clé côté Angular:
- `src/environments/environment.ts` et `src/environments/environment.development.ts` :
  - étendre le type `RuntimeEnv`
  - ajouter le fallback dans l’objet `environment`.

3) Fournir la valeur au runtime:
- Docker: ajouter la variable dans `docker-compose.yml` (section `environment`) ou dans un `.env`.
- Local: export de variable `ENV_VAR=...` avant de lancer `npm run serve:ssr:backpacking`.
