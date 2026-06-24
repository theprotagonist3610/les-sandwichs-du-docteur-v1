/*
schema d'un user {
  id: auto genere par firebase auth,
  nom: string,
  prenoms: string,
  email: string,
  telephone: string,
  sexe: enum('Homme', 'Femme', 'Autre'),
  dateNaissance: date,
  role: enum('admin', 'superviseur', 'vendeur'),
  createdAt: timestamp,
  updatedAt: timestamp,
}

fonctionnalites voulues
- gestion des utilisateurs (CRUD) par les admins
- chaque utilisateur peut voir et modifier son propre profil
- les vendeurs peuvent uniquement voir et modifier leur propre profil
- les superviseurs et admins peuvent voir et modifier les profils de tous les utilisateurs
- les admins peuvent creer, modifier et supprimer des utilisateurs (un utilisateur peut se creer un compte si et seulement si dans la tables users il y a deja une entree avec son email, sinon il faut qu'un admin le cree)
- chaque user peut changer son mot de passe
- les admins peuvent reseter le mot de passe d'un utilisateur
- les utilisateurs peuvent uploader une photo de profil
- les utilisateurs peuvent voir l'historique de leurs connexions
- integrer supabase pour la gestion des utilisateurs et l'authentification
- quand un utilisateur est supprime, son compte est freeze, il ne peut plus se connecter mais ses donnees sont conservees pour l'historique
- quand un utilisateur se connecte, on utilise le store activeUserStore pour stocker ses infos en local
- les utilisateurs inactifs depuis plus de 6 mois sont automatiquement desactives (ne peuvent plus se connecter) et un email leur est envoye pour les informer
*/
