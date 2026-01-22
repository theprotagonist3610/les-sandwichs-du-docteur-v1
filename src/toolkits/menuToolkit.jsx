/*
schema d'un menu {
  id: auto genere,
  nom: string,
  type : enum('boisson', 'sandwich', 'dessert', 'menu complet'),
  description: string,
  ingredients: array de strings (peut etre vide),
  indice_calorique: {joule: float, calorie: float},
  prix: float, 0.0 par defaut (si 0.0 par defaut alors statut = 'indisponible' automatiquement),
  image_url: string (url de l'image du menu),
  statut: enum('disponible', 'indisponible'),
  createdAt: timestamp,
  updatedAt: timestamp,
}

fonctionnalites voulues
- gestion des menus (CRUD) par les admins
- tout le monde peut lire la liste des menus et leurs details
- les admins peuvent creer, modifier et supprimer des menus
- chaque menu doit avoir un nom, un type, une description, un prix, un statut
- integration avec supabase pour le stockage et la gestion des menus
- possibilite d'uploader une image pour chaque menu, l'image est stockee dans supabase storage et l'url est enregistre dans la table des menus
- possibilite de filtrer les menus par type et statut
- possibilite de rechercher des menus par nom ou ingredients
- script d'initialisation de la table des menus, enable realtime sur cette table
- possibilite d'exporter la liste des menus au format CSV ou JSON
*/
