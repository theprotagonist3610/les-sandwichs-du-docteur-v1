/*
schema d'une adresse {
  id: auto genere,
  departement: string,
  commune: string,
  arrondissement: string,
  quartier: string,
  localisation: JSON (lat, lng),
  createdAt: timestamp,
  updatedAt: timestamp,
}

fonctionnalites voulues
- gestion des adresses (CRUD) par tous les utilisateurs (admins, superviseurs, vendeurs)
- chaque utilisateur peut voir et modifier les adresses
- integrer supabase pour la gestion des adresses
- chaque adresse doit avoir une localisation precise (lat, lng) pour faciliter la livraison
- possibilite de rechercher des adresses par departement, commune, arrondissement, quartier
- possibilite de filtrer les adresses par proximite geographique (ex: toutes les adresses dans un rayon de 5km d'un point donne)
- initialiser la table des adresses avec des donnees geographiques precises
- les adresses seront initialise depuis assets/adresse_liste.json, qui est un archive contenant une liste d'adresses avec leurs details geographiques il faudra utiliser l'API nominatim pour recuperer les coordonnees GPS (lat, lng) de chaque adresse
- possibilite d'exporter la liste des adresses au format CSV ou JSON
*/
