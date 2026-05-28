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
    workoutAnalyzer.test.ts  → Tests unitaires Vitest (48 tests)
    workoutAnalyzer.regression.test.ts → Test de régression (fixture JSON)
    __fixtures__/            → Fixtures JSON pour les tests (pas de fichiers FIT)
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

### Branches
- `main` : production — merge uniquement depuis `dev` (CI + 1 review obligatoires)
- `dev` : branche principale de développement
- `feat/<nom>` : nouvelle feature → branche depuis `dev`, PR vers `dev`
- `fix/<nom>` : correction de bug → branche depuis `dev`, PR vers `dev`

### Exception : changements purement documentaires

Pour les modifications qui ne touchent que la doc (README, CHANGELOG, CLAUDE.md, commentaires) :
- **Pas besoin de créer une issue** — passer directement à la branche.
- Utiliser le préfixe `docs/<nom>` pour la branche.

### Ordre à respecter impérativement

1. **Créer une issue GitHub** décrivant la feature ou le bug en langage naturel (français).
   L'utilisateur valide l'issue avant que le développement commence.
   **Si l'approche décidée change après la création de l'issue**, mettre à jour la description de l'issue avant de commencer à coder.

2. **Créer la branche** depuis `dev` :
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b feat/<nom>
   ```

3. **Faire tous les changements** en plusieurs commits thématiques sur la branche.
   Ne pas créer la PR tant que tout n'est pas terminé.

4. **Créer la PR** en une seule fois, une fois tous les commits faits, en la liant à l'issue (`Closes #<n>`).

### Pourquoi créer la PR uniquement à la fin

L'auto-merge est activé : dès que la CI passe, GitHub rebase, merge et **supprime la branche automatiquement**.
Pousser un commit supplémentaire sur une PR ouverte peut déclencher le merge avant que tous les changements soient là.
**Ne jamais ouvrir la PR avant d'avoir fini.**

### CI / auto-merge
- CI (type check + build) obligatoire sur toutes les PRs
- Merge automatique en rebase dès que les conditions sont remplies
- Branche supprimée automatiquement après merge

## Fichiers importants

- `samples/` → fichiers FIT de test, non commités (dans .gitignore) — données personnelles GPS
- `src/lib/__fixtures__/` → fixtures JSON synthétiques pour les tests, commités dans le repo
- `CHANGELOG.md` → à mettre à jour à chaque version
