# Changelog

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
