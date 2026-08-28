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

`ops/deploy.sh` : lancé par cron toutes les ~3 min, il `git pull` `main` et redéploie
seulement s'il y a du nouveau (install → `drizzle-kit migrate` idempotent → build →
`touch back/tmp/restart.txt`). Rien n'entre : ni SSH runner, ni IP à autoriser.

Réglage unique (à faire **une** fois en SSH, quand l'IP est autorisée) :
1. **Clé de déploiement** lecture seule : `ssh-keygen -t ed25519 -f ~/.ssh/verdure_deploy -N ''`
   puis ajouter la clé publique dans GitHub → repo → Settings → Deploy keys.
2. **Cloner** le monorepo : `git clone git@github.com:MatthiasChometon/verdure.git ~/verdure`
   (avec `~/.ssh/config` pointant l'host sur la clé ci-dessus), et **reporter** le `.env`
   du back dans `~/verdure/back/.env`.
3. **Pointer Passenger** (app root) sur `~/verdure/back` — via cPanel « Setup Node.js App »
   ou le fichier de conf de l'app.
4. **Cron** (cPanel → Cron Jobs) :
   `*/3 * * * * /bin/sh $HOME/verdure/ops/deploy.sh >> $HOME/deploy.log 2>&1`

Vérifier les chemins dans `ops/deploy.sh` (nodevenv, app root) sur la machine avant
d'activer le cron. Le premier déploiement manuel valide la chaîne ; ensuite tout est
automatique.
