/*
schema d'une adresse {
  id: auto genere,
  type : enum("livraison", "sur-place")
  client: string ("non identifie" par defaut ou si non fournie)
  lieu_livraison: string ou JSON (adresse complete),
  instructions_livraison: string,
  contact_client: string (telephone),
  contact_alternatif ou de la personne a livrer : string (telephone),
  livreur: string (id du livreur, peut etre null si pas encore assigne),
  statut: enum("en_attente", "en_cours", "livree", "annulee"),
  date_livraison: date,
  date_reelle_livraison: date,
  heure_livraison: time,
  heure_reelle_livraison: time,
  frais_livraison: float, 
  promotion: JSON (code promo, type de reduction, montant de la reduction, etc) lire utils/promotionToolkit.jsx, 
  statut_paiement: enum("non_payee", "partiellement_payee", "payee"),
  statut_commande: enum("en_cours", "terminee", "annulee"), 
  details_commandes: JSON (liste des commandes associees),
  details_paiement: JSON {total, total_apres_reduction, momo, cash, autre},
  vendeur: string (id du vendeur qui a pris la commande),
  createdAt: timestamp,
  updatedAt: timestamp,
}

fonctionnalites voulues
- gestion des commandes (CRUD) par tous les utilisateurs (admins, superviseurs, vendeurs)
- chaque utilisateur peut voir et modifier les non cloturees 
- integrer supabase pour la gestion des commandes
- gestion du paiement des commandes avec possibilite de reduction absolue ou en pourcentage
- gestion des details des commandes array (items, quantites, prix unitaire, total)
- assignation de livreur a une commande
- cloture d'une commande une fois livreee ou annulee
- fonction de cloture d'un journee pour archiver les commandes terminees ou annulees du jour
- cache local synchronise avec supabase pour acces hors ligne
- gestion de collisions en cas de modifications concurrentes
- possibilite de rechercher des commandes par departement, commune, arrondissement, quartier
- possibilite de filtrer les commandes par type, client, vendeur, ...,proximite geographique (ex: toutes les commandes dans un rayon de 5km d'un point donne)
- initialiser la table des commandes avec un script sql
- possibilite d'exporter la liste des commandes au format CSV ou JSON
*/
