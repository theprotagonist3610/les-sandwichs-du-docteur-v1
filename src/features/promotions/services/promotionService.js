/*
schema d'un livreur {
  id: auto genere,
  denomination: string,
  reduction_absolue: number,
  reduction_relative: number,
  periode: number,
  eligible_sur: string,
  date_debut: timestamp,
  date_fin: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
}

fonctionnalites voulues
- gestion des promotions (CRUD) par tous les adminstrateurs
- chaque utilisateur peut voir les promotions
- integrer supabase pour la gestion des promotions
- possibilite de filtrer les promotions par date (ex: promotions actives aujourd'hui, promotions a venir, promotions expirees)
- possibilite de rechercher des promotions par denomination ou type de reduction
- initialiser la table des promotions avec des donnees de test
*/
