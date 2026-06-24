/*
schema d'un rapport {
  id: auto genere,
  denomination: rapport_DDMMYYYY,
  total_ventes: number,
  total_encaissement: number,
  total_depense: number,
  objectifs:{
    ventes: +/-%,
    encaissement: +/-%,
    depense: +/-%,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
}

fonctionnalites voulues
- gestion des rapports (CRUD) par tous les adminstrateurs
- les admins peut voir les rapports
- integrer supabase pour la gestion des rapports
- possibilite de filtrer les rapports par date (selon les dates et les objectifs)
- initialiser la table des rapports
*/
