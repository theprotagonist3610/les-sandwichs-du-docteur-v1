/*
schema d'un emplacement {
  id: auto genere,
  nom: string,
  type : enum('base', 'stand', 'kiosque', 'boutique'),
  adresse: JSON({departement:string, commune:string, arrondissement:string, quartier:string, localisation:{lat:0.0, lng:0.0}}),
    responsableId: string (id d'un user),
    horaires:JSON({lundi: {ouverture: "08:00", fermeture: "18:00"}, mardi: {...}, ...}),
    statut: enum('actif', 'inactif', 'ferme temporairement'),
  createdAt: timestamp,
  updatedAt: timestamp,
}

fonctionnalites voulues
- gestion des emplacements (CRUD) par les admins
- les superviseurs peuvent voir la liste des emplacements et leurs details
- les admins peuvent creer, modifier et supprimer des emplacements
- chaque emplacement doit avoir un responsable (un user)
- possibilite de definir les horaires d'ouverture et de fermeture pour chaque jour de la semaine
- possibilite de definir le statut de l'emplacement (actif, inactif, ferme temporairement)
- capacite d'utiliser l'api navigation pour recuperer les coordonnees GPS d'une adresse
- l'adresse doit etre stockee de maniere structuree (departement, commune, arrondissement, quartier, localisation GPS), la localisation GPS etant un objet avec latitude et longitude avec les valeurs nulles par defaut
- affichage des emplacements sur une carte 2 dimensions dans l'interface admin. La carte est un simple canvas + svg avec des points representant les emplacements selon leurs coordonnees GPS
- possibilite de filtrer les emplacements par statut, type, ou responsable
- integration avec supabase pour le stockage et la gestion des emplacements
*/
