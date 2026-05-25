# Bright Dashboard — Running

Application web locale d'analyse de séances de course à pied à partir de fichiers FIT.
Compatible avec toutes les montres GPS exportant en FIT : Garmin, Coros, Suunto, Polar, Wahoo, etc.

## Lancer le projet

```bash
npm run dev   # http://localhost:3000
```

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS + Recharts
- `fit-file-parser` pour lire les fichiers FIT côté serveur (standard ANT+)

## Architecture

```
src/
  app/
    page.tsx                 → render AnalysisDashboard
    api/analyze/route.ts     → POST: parse FIT + analyzeWorkout()
  lib/
    workoutAnalyzer.ts       → Moteur de détection des intervalles
  components/
    AnalysisDashboard.tsx    → Upload + affichage résultats (client)
    LapChart.tsx             → Bar chart Recharts (client)
  types/
    fit-file-parser.d.ts     → Déclarations TypeScript
```

## Algorithme d'analyse (workoutAnalyzer.ts)

- **Effort** : `avg_speed >= maxSpeed * 0.80`
- **Récupération** : `avg_speed < 5 km/h`
- **Échauffement / Retour calme** : laps "facile" avant/après le bloc intervalles
- **Séries multiples** : récupération > 2.5× la moyenne → nouvelle série
- **Structure** : `"7×1km"`, `"2×(4×400m)"`, etc.

## Données FIT standard (champs utilisés)

- `lap.avg_speed` (km/h), `lap.total_distance` (km)
- `lap.total_timer_time` (temps actif), `lap.total_elapsed_time` (avec pauses)
- `lap.avg_heart_rate`, `lap.max_heart_rate`
- `lap.avg_cadence` → afficher `× 2` pour obtenir spm réel
- `session.total_distance`, `session.avg_heart_rate`, `session.sport`

## Compatibilité marques

Le format FIT est standardisé (ANT+ / Garmin). Toutes les marques principales l'exportent
avec les mêmes champs de base. Les champs propriétaires (puissance Stryd, données Garmin Running
Dynamics, etc.) sont ignorés sans erreur grâce à l'option `force: true` du parseur.

## Design

- Fond `#0C0C0C`, accent brand `#E8FF47` (lime)
- Effort = lime, Récupération = blue-400, Facile/Échauff = gris

## Profil utilisateur

Développeur système embarqué, pas de background web.
Expliquer simplement, ne pas noyer dans les détails techniques web.

## Git workflow

- `main` : production — merge uniquement depuis `dev` (CI + 1 review obligatoires)
- `dev` : branche principale de développement
- `feat/<nom>` : nouvelle feature → branche depuis `dev`, PR vers `dev`
- `fix/<nom>` : correction de bug → branche depuis `dev`, PR vers `dev`

CI (type check + build) obligatoire sur toutes les PRs.
Auto-merge (rebase) activé : merge automatique dès que les conditions sont remplies, branche supprimée après merge.

## Fichiers importants

- `samples/` → fichiers FIT de test, non commités (dans .gitignore)
- `CHANGELOG.md` → à mettre à jour à chaque version
