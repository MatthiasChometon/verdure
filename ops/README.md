# Déploiement continu

Objectif : un push sur `main` déploie en prod, **sans jamais se reconnecter en SSH**.
Le pare-feu o2switch bloque par IP (le SSH tombe en *timeout*, pas en « auth
refusée ») et l'IP change → on ne pousse jamais *vers* o2switch. On inverse le sens.

## Front — Netlify (GitHub Action)

`.github/workflows/deploy-front.yml` : à chaque push touchant `front/**` (ou le
`schema.gql`), build statique + `netlify deploy --prod` sur le site `verdure-plants`.
Netlify n'est pas derrière le pare-feu → un token suffit.

Réglage unique :
1. Netlify → User settings → Applications → **New access token**.
2. GitHub → repo → Settings → Secrets and variables → Actions → **`NETLIFY_AUTH_TOKEN`**.

Tant que le secret n'est pas posé, le workflow s'exécute en vert et saute le déploiement.

## Back — o2switch (cron qui tire)

`ops/deploy.sh` : lancé par cron toutes les ~3 min, il `git pull` `main` et, s'il y a
du nouveau, **rsync** la source dans l'app dir existante (`~/apps/verdure-back`, app root
Passenger inchangé), rebuild (`vite emails` + `nest build`) et `touch tmp/restart.txt`.
Rien n'entre : ni SSH runner, ni IP à autoriser.

**Migrations : manuelles.** Le journal drizzle de la prod est vide (les migrations ont
été appliquées à la main via psql), donc `drizzle-kit migrate` rejouerait tout. Quand un
commit **ajoute** une migration, le cron se met en pause (log) sans rien déployer :
appliquer la migration à la main (psql), avancer le clone (`git -C ~/verdure reset --hard
origin/main`), puis relancer un déploiement. Les commits code-only continuent, eux, à se
déployer tout seuls. Les migrations sont rares.

Réglage unique (à faire **une** fois en SSH) — tout est dans le one-shot idempotent :

```sh
bash ops/setup-cron.sh   # via scp, ou depuis le clone une fois créé
```

Il génère/teste la clé de déploiement (et affiche la clé publique à ajouter dans GitHub →
repo → Settings → Deploy keys si besoin), clone `~/verdure`, et installe le cron. Penser à
placer le `.env` du back dans `~/apps/verdure-back/.env` (déjà le cas — l'app tourne déjà
depuis cet emplacement).
