# Bright Dashboard — Running

Application web d'analyse de séances de course à pied à partir de fichiers FIT.  
Compatible avec toutes les montres GPS : **Garmin, Coros, Suunto, Polar, Wahoo**, et toute montre respectant le standard ANT+.

## Démo

Déployée sur Vercel — connexion requise (compte gratuit).

## Fonctionnalités

- **Analyse automatique** d'un fichier `.fit` : structure de séance, intervalles, allure, FC
- **Historique des séances** : toutes tes séances enregistrées, avec date réelle de la séance
- **Graphique de progression** : évolution de l'allure effort et FC moy. dans le temps
- **Détail de séance** : relire n'importe quelle séance passée
- **Déduplication** : un même fichier ne peut pas être importé deux fois
- **Multi-utilisateur** : chaque compte voit uniquement ses propres séances

## Utilisation

1. Créer un compte (email / mot de passe)
2. Exporter une activité depuis ton appli montre au format **FIT**
3. Déposer le fichier `.fit` dans la zone d'upload
4. Le dashboard analyse la séance et l'enregistre automatiquement
5. Retrouver l'historique et le graphique de progression dans **Mes séances**

## Lancer en local

```bash
npm install
npm run dev   # http://localhost:3000
```

Variables d'environnement requises dans `.env.local` :
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

Et dans `.env` (pour Prisma CLI) :
```
DATABASE_URL=postgresql://...   # URL directe Supabase port 5432
```

## Ce que le dashboard analyse

- **Type de séance** : intervalles, facile, tempo, inconnu
- **Structure** : `7×1km`, `6×1'30"`, `2×(4×400m)`, etc.
- **Intervalles par distance ou par temps** : détection automatique
- **Par répétition** : allure, distance ou durée selon le type
- **Récupérations** : durée moyenne entre les efforts
- **Métriques globales** : allure effort moy., distance effort, distance totale, FC moy.
- **Carte GPS** : tracé du parcours (si données GPS présentes)
- **Graphique** : vitesse par lap avec FC en overlay
- **Tableau** : tous les laps avec allure, FC, cadence

## Stack

| Rôle | Outil |
|------|-------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Style | Tailwind CSS |
| Graphiques | Recharts |
| Carte | react-leaflet |
| Auth | Clerk |
| Base de données | Supabase (PostgreSQL) |
| ORM | Prisma v7 |
| Parseur FIT | fit-file-parser (ANT+) |
| Tests | Vitest |
| Déploiement | Vercel |

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
    LapChart.tsx                        → Graphique vitesse par lap (Recharts)
    MapView.tsx                         → Carte Leaflet (client)
    ShareCard.tsx                       → Carte exportable
    ProgressionChart.tsx                → Graphique progression allure/FC (Recharts)
    ProgressionSection.tsx              → Wrapper 'use client' pour ProgressionChart
  generated/prisma/                     → Client Prisma généré (gitignore, généré au build)
  types/
    fit-file-parser.d.ts                → Déclarations TypeScript
prisma/
  schema.prisma                         → Schéma DB (modèle Workout)
  migrations/                           → Historique des migrations SQL
prisma.config.ts                        → Config Prisma (DATABASE_URL via dotenv)
```

## Tests

```bash
npm test       # Tests unitaires + régression
npm run lint   # ESLint TypeScript
```

## Format supporté

| Format | Support |
|--------|---------|
| `.fit` | ✅ Toutes marques |
| `.gpx` | Non |
| `.tcx` | Non |
| `.csv` | Non |
