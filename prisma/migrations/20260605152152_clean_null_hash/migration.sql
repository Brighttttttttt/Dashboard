-- Supprimer les séances sans fileHash (sauvegardées avant l'ajout de la déduplication)
-- Ces lignes ne peuvent pas être dédupliquées correctement.
DELETE FROM "Workout" WHERE "fileHash" IS NULL;
