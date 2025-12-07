Convert7z Server
=================

Petit serveur Express qui reçoit des fichiers et crée une archive `.7z` en utilisant `7-Zip` installé localement.

Prérequis
- Node.js 16+ (ou équivalent)
- `7z` (7-Zip) installé et accessible dans le PATH (`7z` sur Linux/macOS ou `"C:\\Program Files\\7-Zip\\7z.exe"` sur Windows)

Installation

```powershell
cd server
npm install
npm start
```

Utilisation
- Envoi un POST multipart/form-data vers `/convert7z` avec les fichiers dans le champ `files[]`.
- Le serveur renverra un fichier `cleaned_files_TIMESTAMP.7z` en réponse.

Notes
- Ce serveur exécute la commande système `7z` pour créer l'archive. Assure-toi que l'outil est installé.
- Ce serveur est un exemple minimal. Pour la production, ajoute de l'authentification, des quotas, et une gestion robuste des erreurs.
