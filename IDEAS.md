# Bright — Roadmap & Idées

Fichier local uniquement (dans .gitignore). Suivi du projet et des étapes à venir.

---

## Vision finale

Un réseau social du sport, centré sur la course à pied :
- Upload et analyse automatique de séances FIT
- Profils utilisateurs, fil d'actualité, stories
- Référencement automatique des courses officielles (GPS + date)
- Comparaison entre coureurs sur la même course

---

## Phase 0 — Améliorer l'app actuelle ✅ en cours

L'app locale actuelle est la base UX du produit. On continue à l'affiner avant d'attaquer le serveur.

### À faire (par ordre de valeur)
- **Fiche de séance exportable** : image ou PDF à partager.
- **Détection tempo** : `workoutType = 'tempo'` existe dans le code mais n'est pas encore détecté.
- **Support GPX** : format alternatif au FIT, utilisé par certaines applis.

### Déjà fait
- ~~Interface mobile~~ ✅ PR #29
- ~~Déploiement Vercel~~ ✅ branche dev
- ~~Protection de branches + CI~~ ✅
- ~~Dependabot~~ ✅
- ~~Détection time-based vs distance-based~~ ✅ PR #44
- ~~Récupération dans la structure~~ ✅ PR #46
- ~~KPI par phase~~ ✅ PR #48
- ~~Cartes de résumé globales~~ ✅ PR #50
- ~~Zones FC (Z1–Z5)~~ ✅ PR #57
- ~~Graphique allure + FC superposés~~ ✅ PR #59
- ~~Cohérence des répétitions~~ ✅ PR #61
- ~~Tableau des laps amélioré~~ ✅ PR #63
- ~~Phrase de résumé automatique~~ ✅ PR #65
- ~~Carte GPS~~ ✅ PR #67

---

## Phase 1 — Fondations serveur

> Prérequis absolu pour tout le reste. À faire en entier avant de passer à la phase 2.

**Stack recommandée (compatible avec le Next.js actuel) :**
- Base de données : **PostgreSQL** via Supabase (gratuit, hébergé, simple à démarrer)
- ORM : **Prisma** (typage TypeScript natif, migrations, très bien documenté)
- Auth : **Clerk** ou **NextAuth v5** (ne pas coder l'auth soi-même — trop critique)
- Stockage fichiers FIT : **Vercel Blob** ou **Supabase Storage**

**Ce qu'on construit :**
- [ ] Schéma base de données : `User`, `Activity`, `Lap`
- [ ] Authentification (inscription, connexion, session)
- [ ] Upload FIT → analyse → stockage en base (au lieu d'être jetée après affichage)
- [ ] Page profil basique (mes séances)
- [ ] Historique des séances avec graphique de progression (allure, volume)

---

## Phase 2 — Profils et activités publiques

> L'app devient consultable par d'autres.

- [ ] Profil public (pseudo, photo, stats globales)
- [ ] Page d'activité publique/privée par séance
- [ ] Paramètre de confidentialité (public / abonnés / privé)
- [ ] URL partageable par séance

---

## Phase 3 — Graphe social

> Le cœur du réseau.

- [ ] Suivre / être suivi
- [ ] Fil d'actualité (activités des personnes suivies)
- [ ] Réactions (kudos / like)
- [ ] Commentaires sur une activité
- [ ] Notifications (nouveau follower, commentaire, etc.)

---

## Phase 4 — Stories

> Format éphémère ou permanent généré depuis les données de séance.

- [ ] Génération automatique d'une story depuis les données (image résumé, structure, allure)
- [ ] Story 24h ou épinglée sur le profil
- [ ] Vue stories dans le fil d'actualité (style Instagram/Snapchat)
- [ ] Partage externe (image exportée)

---

## Phase 5 — Référencement des courses officielles

> La fonctionnalité la plus complexe — à bien concevoir.

- [ ] Base de données de courses officielles (dates, lieux, distances, tracés GPS)
  - Option A : construire la base manuellement (France d'abord)
  - Option B : s'appuyer sur une API existante (Ahotu, RunSignup, etc.)
- [ ] Détection automatique : le tracé GPS de la séance correspond-il à une course connue ?
- [ ] Page course : tous les coureurs ayant participé, classement des temps, comparaison
- [ ] Badge "Course officielle" sur l'activité

---

## Phase 6 — Mobile

> Rendre l'app vraiment native ou installable.

- Option A (simple) : **PWA** — installable depuis le navigateur, fonctionne hors ligne pour les séances déjà chargées. Pas de store.
- Option B (complet) : **React Native / Expo** — vraie app iOS/Android, accès Bluetooth montre. Beaucoup plus de travail.

Recommandation : commencer par la PWA (Phase 0 presque déjà prête), puis évaluer si React Native vaut le coût selon la traction.

---

## Infrastructure & workflow (continu)

- ~~Protection de branches GitHub~~ ✅
- ~~Dependabot~~ ✅
- ~~CI (type check + build + tests)~~ ✅
- ~~Auto-merge PR~~ ✅
- **Tests E2E (Playwright)** : à envisager quand l'app aura un vrai flux utilisateur (inscription → upload → profil)
- **Migration ESLint flat config** : débloquerait les mises à jour ESLint 9/10 (actuellement ignorées dans Dependabot)
- **Monitoring / erreurs** : Sentry ou équivalent quand on passe en multi-utilisateurs

---

## Notes

- Le fichier FIT reste le seul format d'entrée prévu à court terme
- Priorité actuelle : finir Phase 0, puis attaquer Phase 1 proprement
- Ne pas essayer de fusionner deux phases en même temps
