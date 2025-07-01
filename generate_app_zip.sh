#!/usr/bin/env bash
set -euo pipefail

# Création du dossier de sortie
mkdir -p output

# Supprime l'archive précédente si elle existe
rm -f output/app.zip

# Génère app.zip en excluant .gitignore, l'archive elle-même, le dossier ChromeWebStore et le répertoire output
zip -r output/app.zip . \
    -x app.zip output/app.zip .gitignore \
       "ChromeWebStore/*" "ChromeWebStore" \
       "output/*" "output" "generate_app_zip.sh"