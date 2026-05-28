# Bright Dashboard — Running

Application web locale d'analyse de séances de course à pied à partir de fichiers FIT.

Compatible avec toutes les montres GPS exportant en FIT : **Garmin, Coros, Suunto, Polar, Wahoo**, et toute montre respectant le standard ANT+.

## Lancer l'application

```bash
npm install
npm run dev
```

Ouvrir **http://localhost:3000** dans le navigateur.

## Utilisation

1. Exporter une activité depuis ton application montre → format **FIT**
2. Déposer le fichier `.fit` dans la zone d'upload
3. Le dashboard analyse automatiquement la séance

## Ce que le dashboard détecte

- **Type de séance** : intervalles, facile, tempo
- **Structure** : `7×1km`, `6×1'30"`, `2×(4×400m)`, etc.
- **Intervalles par distance ou par temps** : détection automatique selon ce qui a varié le moins
- **Par répétition** : allure, distance ou durée selon le type
- **Récupérations** : durée moyenne entre les efforts
- **Métriques globales** : allure effort moy., distance effort, distance totale, FC moy.
- **Graphique** : vitesse par lap (effort / récupération / échauffement)
- **Tableau** : détail de tous les laps avec allure, FC, cadence

## Format supporté

| Format | Support |
|--------|---------|
| `.fit` | ✅ Toutes marques |
| `.gpx` | Non |
| `.tcx` | Non |
| `.csv` | Non |

## Architecture

```
src/
  app/
    page.tsx                 → Point d'entrée
    layout.tsx
    globals.css
    api/analyze/route.ts     → API : parse FIT + analyse
  lib/
    workoutAnalyzer.ts       → Moteur de détection des intervalles
    workoutAnalyzer.test.ts  → Tests unitaires (Vitest)
    workoutAnalyzer.regression.test.ts → Test de régression
    __fixtures__/            → Fixtures JSON pour les tests
  components/
    AnalysisDashboard.tsx    → Interface principale (upload + résultats)
    LapChart.tsx             → Graphique vitesse par lap
  types/
    fit-file-parser.d.ts     → Types TypeScript
```

## Stack

- **Next.js 16** — App Router
- **TypeScript**
- **Tailwind CSS**
- **Recharts** — graphiques
- **fit-file-parser** — lecture du format FIT standard (ANT+)
- **Vitest** — tests unitaires et de régression
- **ESLint** + **@typescript-eslint** — linting statique

## Tests

```bash
npm test       # 58 tests (unitaires + régression)
npm run lint   # ESLint TypeScript
```

Les tests couvrent toutes les fonctions de `workoutAnalyzer.ts` : classification des laps, détection time-based, labels de structure, arrondi des distances, formatage des allures.

Le test de régression utilise un fixture JSON synthétique (`src/lib/__fixtures__/7x1km_session.json`) représentant une session 7×1km réaliste, sans données personnelles.
