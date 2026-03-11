# Medical Tool 21JC — Extension Chrome

Extension Chrome (Manifest V3) conçue pour le panel médical de l'intranet du serveur roleplay **21 Jump Click**.
Elle s'injecte uniquement sur `https://intra.21jumpclick.fr/medical/files` et automatise les tâches répétitives de saisie des rapports médicaux.

Version actuelle : **1.6.2**

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Architecture des fichiers](#architecture-des-fichiers)
3. [Installation](#installation)
4. [Utilisation détaillée](#utilisation-détaillée)
5. [Templates de blessures](#templates-de-blessures)
6. [Modes hôpital](#modes-hôpital)
7. [Données et confidentialité](#données-et-confidentialité)

---

## Fonctionnalités

### 1. Sélecteur de templates de blessures

Un menu déroulant est injecté directement dans le formulaire de création/modification de rapport médical.

En sélectionnant un template, l'extension remplit automatiquement :

- **Type** du rapport (Note interne / Intervention / Consultation)
- **Code postal** de l'hôpital
- **Durée d'invalidité**
- **Blessures** (champ `injuriesRemark`) — ajout cumulatif, sans écraser l'existant
- **Examens** (champ `examinationsRemark`) — fusionnés avec les données déjà présentes, triés par catégorie
- **Traitements** (champ `treatmentsRemark`) — fusionnés, avec gestion automatique Chir AG / Chir AL
- **Remarques** (champ `remark`) — fusionnées
- **Date d'entrée** (`admission`) — heure actuelle au fuseau Europe/Paris
- **Date de visite de contrôle** (`controlVisit`) — calculée automatiquement depuis la date d'entrée + durée d'invalidité
- **Incapacités** — cases à cocher (Saut, Course, Conduite, Armes)
- **Coma** — case à cocher

> La durée d'invalidité n'est mise à jour que si la nouvelle valeur est supérieure à celle déjà saisie, pour ne pas écraser un cas plus grave déjà entré.

---

### 2. Editeur de templates (liste de blessures)

Accessible via le panneau flottant > **"Configurer la liste"**.

Interface modale complète permettant de :

- **Créer** un nouveau template
- **Renommer** un template existant
- **Réordonner** les templates (boutons haut/bas)
- **Supprimer** un template
- **Modifier** tous les champs d'un template :
  - Nom, type, durée d'invalidité, code postal
  - Blessures (texte libre)
  - Examens par catégorie (Constantes, Auscultation, Radio, Echo, IRM, Scanner, Ethylomètre, Test salivaire, Autres)
  - Traitements par catégorie (Chir AG, Chir AL, Manipulations, Médicaments, Autres)
  - Remarques
  - Incapacités (cases à cocher : Saut, Course, Conduite, Armes)
  - Coma (case à cocher)
- **Sauvegarder** les modifications dans le `localStorage`
- **Réinitialiser** aux templates par défaut (depuis `data/injuries.json`)

---

### 3. Calculateur de date de visite de contrôle

Un bouton **"Recalculer"** (icone de recycle) est ajouté à côté du champ "Visite de contrôle".

Il recalcule la date de visite de contrôle à partir de :
- La date d'entrée saisie dans le champ `admission`
- La durée d'invalidité saisie dans le champ `disabilityDuration`

Utile pour recalculer manuellement sans devoir resélectionner un template.

---

### 4. Bouton "VM Maintenant"

Injecté à côté du champ date de visite médicale (`medicalVisitDate`).

Rempli ce champ avec la **date du jour** (format JJ/MM/AAAA) au fuseau Europe/Paris.

---

### 5. Bouton "DDS Maintenant"

Injecté à côté du champ date de don de sang (`bloodDonationDate`).

Rempli ce champ avec la **date et l'heure actuelles** (format JJ/MM/AAAA HH:mm) au fuseau Europe/Paris.

---

### 6. Bouton "Groupe sanguin aléatoire"

Injecté à côté du champ groupe sanguin (`bloodgroup`).

Génère aléatoirement un groupe parmi : A+, A−, B+, B−, AB+, AB−, O+, O−.

---

### 7. Bouton "VC" (Visite de Contrôle)

Visible sur chaque rapport médical existant (sauf ceux de type VC ou VM).

En cliquant dessus, l'extension :

1. Lit les examens, traitements et remarques du rapport original
2. Détecte les éléments nécessitant un suivi (bandages, attelles, fauteuil, canne, etc.) par correspondance exacte ou approximative (distance de Levenshtein)
3. Stocke ces données dans le `localStorage` (`VC_needed`, `VC_Exams`, `VC_Treatments`, `VC_Remarks`)
4. Ouvre automatiquement un nouveau formulaire de rapport

Lors de l'ouverture du nouveau formulaire, les données VC sont automatiquement injectées :

- Type : Note interne
- Blessures : `VC`
- Examens : les résultats originaux marqués `RAS`
- Traitements : `Retrait [éléments détectés]`
- Remarques : `Récupération [éléments détectés] + FDS`

---

### 8. Mise en évidence des erreurs

L'extension scanne en continu l'ensemble de la page à la recherche du texte **"infos pas ok"** et le met en évidence en **rouge gras** pour le rendre immédiatement visible dans la liste des dossiers.

---

### 9. Panneau flottant de configuration

Un panneau discret est affiché en haut à droite de l'écran sur toutes les pages de l'intranet.

Il contient :

- La version de l'extension
- **Configurer le zip par défaut** : définit le code postal utilisé pour les templates qui ont `"codePostal": "hospital_zip"`. Stocké dans le `localStorage` sous la clé `user_hospital_zip`.
- **Configurer la liste** : ouvre l'éditeur de templates
- **Menu LSES** : active le mode LSES (ajoute des raccourcis spécifiques LSES dans la navigation)
- **Menu BCES** : active le mode BCES (ajoute des raccourcis spécifiques BCES dans la navigation)
- **Menu par défaut** : désactive les menus hôpital spécifiques

---

### 10. Menu de navigation personnalisé (selon le mode hôpital)

Des liens supplémentaires sont injectés dans la navigation latérale de l'intranet selon le mode hôpital sélectionné :

| Mode | Lien ajouté |
|------|------------|
| LSES | LSES Inventory (lses-inventory.web.app) |
| BCES | Dispatch (Google Sheets) |

---

## Architecture des fichiers

```
Medical Tool 21JC/
├── manifest.json          # Configuration de l'extension (MV3)
├── background.js          # Service worker : ré-injection des scripts sur navigation
├── content.js             # Script principal : toute la logique et l'UI
├── utils.js               # Fonctions utilitaires partagées
├── data/
│   └── injuries.json      # Templates de blessures par défaut
├── icons/
│   ├── 48.png
│   ├── 128.png
│   └── logo.png
└── ChromeWebStore/        # Assets pour le Chrome Web Store
```

### `manifest.json`

- Manifest version 3
- Permissions : `scripting`, `tabs`
- Host permissions : `https://intra.21jumpclick.fr/medical/files`
- Content scripts injectés sur la page cible au chargement (`document_idle`)
- Service worker : `background.js`

### `background.js`

Service worker qui écoute les mises à jour d'onglets. Lorsqu'une page de `intra.21jumpclick.fr` est complètement chargée, il ré-injecte `utils.js` et `content.js`. Cela permet à l'extension de fonctionner même lors de navigations côté client (SPA) où le DOM est rechargé sans rechargement complet de la page.

### `utils.js`

Fonctions globales exposées sur `window` :

| Fonction | Description |
|----------|-------------|
| `formatDateTimeFR(date)` | Formate une date en `DD/MM/YYYY HH:mm` |
| `formatDateFR(date)` | Formate une date en `DD/MM/YYYY` |
| `getTimezoneOffsetFor(timeZone, date)` | Retourne le décalage UTC en minutes pour un fuseau donné |
| `parseDateFR(str)` | Parse une chaîne `DD/MM/YYYY HH:mm` en objet `Date` |
| `levenshtein(a, b)` | Calcule la distance de Levenshtein entre deux chaînes |
| `contientApprox(texte, mot, tolerance)` | Vérifie si un mot est présent dans un texte avec tolérance d'approximation |
| `setTextFieldValue(selector, value)` | Injecte une valeur dans un champ React en déclenchant les événements nécessaires |
| `setTextFieldValueIfEmpty(selector, value)` | Idem, uniquement si le champ est vide |
| `setTextFieldValueIfMax(selector, value)` | Idem, uniquement si la nouvelle valeur est supérieure à l'existante |

### `content.js`

Script principal. S'exécute dans une IIFE asynchrone. Principaux blocs :

- **Chargement des templates** : depuis le `localStorage` ou depuis `data/injuries.json` au premier démarrage
- **Helpers DOM** : `createElement`, `parseRemarkField`, `mergeParsedData`, `formatRemarkData`, `updateRemarkField`
- **Logique métier** : `addBlessures`, `addExamens`, `addTraitements`, `addRemarques`, `handleCaseSelection`
- **Injections UI** : `injectSelect`, `injectAlert`, `injectDateCalculatorButton`, `injectBloodTypeButton`, `injectSimpleButton`, `injectVCButton`, `injectIcon`, `injectMenuItems`
- **Boucle principale** : `setInterval` à 500ms qui appelle toutes les fonctions d'injection (détecte les changements de page de la SPA et injecte les éléments si absents)

### `data/injuries.json`

Fichier JSON contenant les templates par défaut. Chaque entrée a la structure suivante :

```json
"Nom du template": {
  "type": "Note interne | Intervention | Consultation | \"\"",
  "codePostal": "code postal ou \"hospital_zip\" pour le zip configuré",
  "dureeInvalidite": "HH:MM:SS ou \"\"",
  "blessures": ["liste", "de", "blessures"],
  "examens": {
    "Constantes": [], "Auscultation": [], "Radio": [],
    "Echo": [], "IRM": [], "Scanner": [],
    "Ethylometre": [], "Test salivaire": [], "Autres": []
  },
  "traitements": {
    "Chir AG": [], "Chir AL": [],
    "Manipulations": [], "Medicaments": [], "Autres": []
  },
  "remarques": {
    "Pret": [], "Facturation": [], "Autres": []
  },
  "incapacites": [1, 2, 3, 4],
  "coma": false
}
```

**Incapacités** : `1` = Saut, `2` = Course, `3` = Conduite, `4` = Armes

---

## Templates de blessures

Templates inclus par défaut :

| Template | Durée invalidité | Notes |
|----------|-----------------|-------|
| VM - Civil | — | Note interne, visite médicale civile |
| VM - Services publics | — | Note interne, avec test effort |
| Déshydratation | 30 min | Coma |
| Hypoglycémie | 30 min | Coma |
| Entorse | 30 min | |
| Fissure | 1h | |
| Fracture nette | 1h | |
| Fracture déplacée | 1h | Chir AG avec fixation |
| Traumatisme crânien | 1h | IRM, incapacités 1-2-3 |
| Commotion cérébrale | 1h | IRM, incapacités 1-2-3 |
| Petit hématome sous dural | 1h | IRM, incapacités 1-2-3 |
| Hématome sous dural | 2h | Trépanation, drainage |
| Tassement de vertèbres | 2h | Injection intervertébrale, incapacités 1-2-3 |
| Intoxication fumées | 30 min | |
| Brulure 1e degré | 30 min | |
| Brulure 2e degré | 30 min | Chir AL |
| Brulure 3e degré | 45 min | Chir AG, greffon, incapacités 1-2-3-4 |
| Noyade | 45 min | Coma |
| Morsure animal | 30 min | |
| Blessure arme contondante | 1h | |
| Blessure arme blanche | 1h | Incapacités 1-2-3-4 |
| BPB NT (balle non traversante) | 1h | Retrait balle, incapacités 1-2-3-4 |
| BPB T (balle traversante) | 1h | Incapacités 1-2-3-4 |
| Retrait tatouages | — | Note interne, facturation 2000$, VC dans 24h |
| Allergie | — | |
| Choc anaphylactique | 45 min | |
| Conso alcool | — | Ethylomètre |
| Coma éthylique | 30 min | Lavage d'estomac, coma |
| Conso drogue douce | 15 min | Test salivaire |
| Conso drogue dure | 30 min | Test salivaire |
| OD drogue douce | 30 min | Coma |
| OD drogue dure | 45 min | Coma |

---

## Modes hôpital

Le mode hôpital est stocké dans `localStorage` sous la clé `user_hospital_name`.

| Valeur | Effet |
|--------|-------|
| `LSES` | Ajoute un lien "LSES Inventory" dans la navigation |
| `BCES` | Ajoute un lien "Dispatch" (Google Sheets) dans la navigation |
| `DEFAULT` ou absent | Aucun lien supplémentaire |

Le mode se configure via le panneau flottant (coin supérieur droit).

---

## Installation

### Mode développeur (recommandé pour usage personnel)

1. Télécharger ou cloner ce dépôt
2. Ouvrir Chrome et aller dans `chrome://extensions/`
3. Activer le **Mode développeur** (interrupteur en haut à droite)
4. Cliquer sur **"Charger l'extension non empaquetée"**
5. Sélectionner le dossier contenant les fichiers de l'extension

### Depuis un fichier `.zip`

Un fichier `output/app.zip` peut être généré via le script `generate_app_zip.sh`.
Ce fichier est destiné à la soumission sur le Chrome Web Store ou au partage.

---

## Utilisation détaillée

### Première utilisation

1. Ouvrir l'intranet 21JC et naviguer vers la section médicale
2. Le panneau flottant apparaît en haut à droite — cliquer sur `<` pour l'ouvrir
3. Configurer le **zip par défaut** de votre hôpital (utilisé pour les templates avec `hospital_zip`)
4. Sélectionner votre **mode hôpital** si applicable (LSES ou BCES)

### Remplir un rapport médical

1. Ouvrir le formulaire de création ou de modification d'un rapport
2. Le menu déroulant de templates apparaît sous le titre du formulaire
3. Sélectionner la blessure correspondante — les champs se remplissent automatiquement
4. Pour plusieurs blessures, sélectionner les templates successivement (les données se cumulent)
5. Ajuster manuellement les champs avec les placeholders `[EN MAJUSCULES]`

### Créer une visite de contrôle (VC)

1. Sur un rapport existant, cliquer sur le bouton **"VC"** dans le menu contextuel du rapport
2. Un nouveau formulaire s'ouvre automatiquement, pré-rempli avec les données de suivi
3. Vérifier et compléter si nécessaire avant de soumettre

### Personnaliser les templates

1. Ouvrir le panneau flottant > **"Configurer la liste"**
2. Sélectionner un template existant ou créer un nouveau
3. Modifier les champs souhaités
4. Cliquer sur **"Sauvegarder tout"**
5. Les modifications sont persistées dans le `localStorage` du navigateur

> En cas de problème, le bouton **"Reset par défaut"** restaure les templates d'origine depuis `data/injuries.json`.

---

## Données et confidentialité

- L'extension n'envoie **aucune donnée à l'extérieur**
- Toutes les données (templates personnalisés, configuration) sont stockées localement dans le `localStorage` du navigateur
- Le code source est entièrement consultable et auditable
- Les permissions demandées (`scripting`, `tabs`) sont utilisées uniquement pour injecter les scripts sur la page cible

---

## Statut

En développement actif.
Pour toute suggestion ou bug, contacter le développeur directement.

> L'utilisation de cette extension doit respecter les règles en vigueur concernant les outils tiers sur le serveur 21 Jump Click.
