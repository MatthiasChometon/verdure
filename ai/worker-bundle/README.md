# verdure — worker IA (bring-your-own-GPU)

Fait tourner la reconnaissance de plantes sur **votre** PC, via votre carte
graphique NVIDIA. Rien n'est exposé sur Internet : le worker ne fait que des
appels **sortants** vers verdure.

## Prérequis

- **Docker Desktop** avec le support GPU NVIDIA activé.
- Une **carte NVIDIA** (~8 Go de VRAM recommandés).
- Un compte verdure (vous devez être connecté dans le navigateur).

## Démarrer

1. Décompressez ce dossier où vous voulez.
2. Lancez le worker :
   - **Windows** : clic droit sur `start.ps1` → « Exécuter avec PowerShell ».
   - **macOS / Linux** : `./start.sh` dans un terminal.
3. Une page **s'ouvre dans votre navigateur** : cliquez sur **Confirmer la
   connexion**. (Aucun code ni jeton à copier.)
4. Laissez la fenêtre ouverte tant que vous voulez identifier des plantes. Votre
   PC apparaît dans « Activer l'IA → Mes appareils ».

Le premier démarrage télécharge les modèles (plusieurs Go) : c'est normal que ce
soit long une fois.

## Arrêter / redémarrer

- Arrêter : `docker compose down` (ou fermez Docker Desktop).
- Le worker retient la connexion : au redémarrage, il repart sans rien vous
  redemander.

## Déconnecter ce PC

Dans l'app : « Activer l'IA → Mes appareils → Déconnecter ». Le worker vous
proposera de ré-appairer au prochain démarrage.
