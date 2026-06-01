# Changelog

## [0.3.0] — 2026-06-01

### Visualisation avancée

#### Ajouté
- **Carte GPS** : tracé de la séance sur fond sombre (CartoDB Dark Matter) via react-leaflet. Affiché uniquement si des données GPS sont présentes (absent pour tapis roulant / piscine). Tracé lime (`#E8FF47`), `fitBounds` automatique.
- **Courbe FC en overlay** : `LapChart` passe de `BarChart` à `ComposedChart` (Recharts). Axe Y droit pour la FC (bpm), gaps automatiques si un lap n'a pas de données FC.
- **Cohérence des répétitions** : chaque barre d'effort est colorée vert→rouge selon l'écart à l'allure moyenne (seuil 8%). Séance régulière → toutes vertes, séance irrégulière → dégradé visible.
- **Résumé automatique** : phrase générée sous le titre (ex. `"7 reps à 3:26/km · FC 162 bpm · allure régulière"`). Détection de tendance par comparaison première/seconde moitié des reps (seuil ±2%).
- **Tableau des laps amélioré** : laps regroupés par phase (Échauffement / Intervalles / Retour calme) avec en-têtes de section. Nouvelle colonne Δ Allure pour les efforts (vert/lime/rouge selon l'écart).

### Qualité
- 93 tests unitaires (+ 7 pour `computePaceTrend`)
- Node.js 24 en CI (LTS actif depuis mai 2026)

---

## [0.2.0] — 2026-05-29

### Intervalles par temps (`6×1'30"`)

#### Ajouté
- Détection automatique des séances programmées par durée (vs par distance) : si le coefficient de variation des temps est 30% plus faible que celui des distances, la séance est considérée time-based
- Label de structure adapté : `6×1'30"` au lieu de `6×400m` quand la montre bippait sur le chrono
- Arrondi des durées au multiple de 5s le plus proche dans les titres (`1'28"` → `1'30"`)
- Tolérance d'arrondi des distances portée à 10% (ex : `880m` → `800m`)

### Qualité et CI

#### Ajouté
- Tests unitaires Vitest : 48 tests couvrant toutes les fonctions de `workoutAnalyzer.ts` (classification des laps, détection time-based, formatage allure/durée, arrondi distances)
- Test de régression : fixture JSON synthétique 7×1km, 10 assertions sur la sortie complète de `analyzeWorkout()`
- ESLint + `@typescript-eslint` : linting TypeScript statique intégré en CI
- CI unifiée : test → lint → typecheck → build → merge PR → fermeture automatique des issues liées

---

## [0.1.0] — 2026-05-24

### Première version — Analyse de séance FIT

#### Ajouté
- Upload de fichier `.fit` Coros par drag & drop ou clic
- Parseur FIT côté serveur (`fit-file-parser`)
- Moteur de détection automatique de la structure de séance :
  - Classification des laps : effort / récupération / échauffement / retour au calme
  - Seuil effort : 80% de la vitesse max de la séance
  - Détection des séries multiples (récup > 2.5× la moyenne)
  - Génération du label de structure : `7×1km`, `2×(4×400m)`, etc.
- Dashboard de résultats :
  - Cartes métriques : allure effort, distance effort, distance totale, FC moy.
  - Grille des répétitions avec allure individuelle et durée de récupération
  - Graphique vitesse par lap (lime = effort, bleu = récup, gris = facile)
  - Tableau complet des laps (allure, FC, cadence, durée)
- Design sombre avec accent lime (`#E8FF47`)
