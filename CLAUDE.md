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
- **Clerk** — authentification (comptes, sessions, pages sign-in/sign-up)
- **Supabase** — base de données PostgreSQL hébergée
- **Prisma v7** — ORM TypeScript, driver adapter `@prisma/adapter-pg`
- Déployé sur **Vercel** (auto-deploy depuis `main`)

## Architecture

```
src/
  app/
    page.tsx                            → Dashboard principal (upload + analyse)
    layout.tsx                          → ClerkProvider (auth) + fonts
    sign-in/[[...sign-in]]/page.tsx     → Page connexion Clerk
    sign-up/[[...sign-up]]/page.tsx     → Page inscription Clerk
    mes-seances/
      page.tsx                          → Historique des séances + graphique progression
      [id]/page.tsx                     → Détail d'une séance (relecture)
    api/analyze/route.ts                → POST: parse FIT + analyzeWorkout() + save DB
  middleware.ts                         → Protection des routes (Clerk)
  lib/
    workoutAnalyzer.ts                  → Moteur de détection des intervalles
    workoutAnalyzer.test.ts             → Tests unitaires Vitest
    workoutAnalyzer.regression.test.ts  → Test de régression (fixture JSON)
    prisma.ts                           → Singleton PrismaClient (serverless-safe)
    __fixtures__/                       → Fixtures JSON pour les tests
  components/
    AnalysisDashboard.tsx               → Upload + affichage résultats (client)
    LapChart.tsx                        → Graphique vitesse par lap (Recharts, client)
    MapView.tsx                         → Carte Leaflet (client)
    ShareCard.tsx                       → Carte exportable (client)
    ProgressionChart.tsx                → Graphique progression allure/FC (Recharts, client)
    ProgressionSection.tsx              → Wrapper 'use client' pour ProgressionChart
  generated/prisma/                     → Client Prisma généré (gitignore, généré au build)
  types/
    fit-file-parser.d.ts                → Déclarations TypeScript
prisma/
  schema.prisma                         → Schéma DB (modèle Workout)
  migrations/                           → Historique des migrations SQL
prisma.config.ts                        → Config Prisma (DATABASE_URL via dotenv)
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
- Le dashboard doit être utilisable sur mobile ET desktop — tester les deux avant de valider une feature UI

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

## Base de données (Supabase + Prisma)

### Modèle Workout
| Champ | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Clé primaire |
| `userId` | String | ID Clerk de l'utilisateur |
| `filename` | String? | Nom du fichier FIT uploadé |
| `fileHash` | String? | SHA-256 du fichier (déduplication) |
| `workoutDate` | DateTime? | Date réelle de la séance (session.start_time FIT) |
| `analyzedAt` | DateTime | Date d'analyse (upload) |
| `sport` | String? | Type de sport |
| `structure` | String? | Ex : "7×1km" |
| `totalDistance` | Float? | Distance totale en km |
| `totalTime` | Float? | Temps actif en secondes |
| `avgHR` | Int? | FC moyenne |
| `data` | Json | Analyse complète (tous les laps, sets, GPS...) |

### Variables d'environnement requises
- `.env` (local, gitignore) → `DATABASE_URL` = URL directe Supabase port 5432 (pour Prisma CLI)
- `.env.local` (local, gitignore) → clés Clerk
- Vercel → `DATABASE_URL` = URL pooler Supabase port 6543 (Transaction mode, pour serverless)
- Vercel → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`

### Commandes Prisma utiles
```bash
npx prisma generate          # Regénérer le client (après modif schema)
npx prisma migrate dev       # Créer + appliquer une migration en local
npx prisma studio            # Interface visuelle de la DB
```

## Fichiers importants

- `samples/` → fichiers FIT de test, non commités (dans .gitignore) — données personnelles GPS
- `src/lib/__fixtures__/` → fixtures JSON synthétiques pour les tests, commités dans le repo
- `CHANGELOG.md` → à mettre à jour à chaque version
- `.env` → DATABASE_URL pour Prisma CLI (gitignore)
- `.env.local` → clés Clerk (gitignore)
