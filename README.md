# Nettoyeur de Noms de Fichiers

## Description
Outil web permettant de nettoyer les noms de fichiers en supprimant les caractères invalides (émoticônes, caractères spéciaux, etc.) tout en conservant les extensions de fichiers.

## Fonctionnalités
- Suppression automatique des caractères invalides
- Conservation des extensions de fichiers (.txt, .jpg, .pdf, etc.)
- Personnalisation de la liste des caractères à supprimer
- Export des résultats nettoyés
- Interface responsive et accessible
- Support SEO complet

## Architecture 777

/ (racine)
│
├── index.html                    # Version texte seulement
├── upload.html                   # Version avec upload de fichiers
├── .gitignore
├── README.md
│
├── assets/
│   ├── css/
│   │   ├── style.css            # Styles communs
│   │   └── upload.css           # Styles upload
│   ├── js/
│   │   ├── script.js            # Script principal
│   │   └── upload.js            # Script upload
│   ├── images/
│   ├── sound/
│   ├── manifest/
│   │   └── site.webmanifest
│   └── icon/                    # Toutes les icônes

## Installation
1. Téléchargez tous les fichiers
2. Placez-les dans la structure de dossiers ci-dessus
3. Ouvrez `index.html` dans un navigateur web

## Utilisation
1. Collez vos noms de fichiers dans la zone de texte (un par ligne)
2. Cliquez sur "Nettoyer les Noms"
3. Les résultats apparaissent avec les noms originaux et nettoyés
4. Exportez les résultats si nécessaire

## Caractères supprimés par défaut
- Émoticônes et symboles (☺, ♥, ★, etc.)
- Caractères spéciaux problématiques (\, /, :, *, ?, ", <, >, |, #)
- Ponctuation (virgules, points, points-virgules, etc.)
- Espaces multiples

## Technologies utilisées
- HTML5
- CSS3 (Flexbox, Grid, animations)
- JavaScript (ES6+)
- Web Manifest (PWA compatible)
- Accessibilité (ARIA, contrastes)

## Compatibilité
- Tous les navigateurs modernes
- Responsive (mobile, tablette, desktop)
- Accessibilité WCAG 2.1

## Auteur
777 Tools

## Licence
Libre d'utilisation et de modification