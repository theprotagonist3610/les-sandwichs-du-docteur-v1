import { z } from "zod";

/**
 * Schémas de validation Zod pour les utilisateurs
 */

// Schéma pour le sexe
const sexeSchema = z.enum(["Homme", "Femme", "Autre"], {
  errorMap: () => ({ message: "Veuillez sélectionner un sexe valide" }),
});

// Schéma pour le rôle
const roleSchema = z.enum(["admin", "superviseur", "vendeur"], {
  errorMap: () => ({ message: "Rôle invalide" }),
});

// Schéma pour le numéro de téléphone (format international)
const telephoneSchema = z
  .string()
  .min(10, "Le numéro de téléphone doit contenir au moins 10 chiffres")
  .regex(
    /^\+\d{1,4}\d{10}$/,
    "Le numéro de téléphone doit être au format international (+indicatif + 10 chiffres)"
  );

// Schéma pour l'email
const emailSchema = z
  .string()
  .email("Email invalide")
  .toLowerCase()
  .trim();

// Schéma pour le mot de passe (minimum 8 caractères, au moins une lettre et un chiffre)
const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)/,
    "Le mot de passe doit contenir au moins une lettre et un chiffre"
  );

// Schéma pour la date de naissance
const dateNaissanceSchema = z
  .string()
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 16 && age <= 100;
  }, "Vous devez avoir au moins 16 ans")
  .or(z.date().refine((date) => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    return age >= 16 && age <= 100;
  }, "Vous devez avoir au moins 16 ans"));

/**
 * Schéma pour la création d'un utilisateur (par admin)
 */
export const userCreateSchema = z.object({
  nom: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim(),
  prenoms: z
    .string()
    .min(2, "Les prénoms doivent contenir au moins 2 caractères")
    .max(100, "Les prénoms ne peuvent pas dépasser 100 caractères")
    .trim(),
  email: emailSchema,
  telephone: telephoneSchema,
  sexe: sexeSchema,
  dateNaissance: dateNaissanceSchema,
  role: roleSchema.default("vendeur"),
});

/**
 * Schéma pour la mise à jour d'un utilisateur
 * Tous les champs sont optionnels
 */
export const userUpdateSchema = z.object({
  nom: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim()
    .optional(),
  prenoms: z
    .string()
    .min(2, "Les prénoms doivent contenir au moins 2 caractères")
    .max(100, "Les prénoms ne peuvent pas dépasser 100 caractères")
    .trim()
    .optional(),
  email: emailSchema.optional(),
  telephone: telephoneSchema.optional(),
  sexe: sexeSchema.optional(),
  dateNaissance: dateNaissanceSchema.optional(),
  role: roleSchema.optional(),
  photoUrl: z.string().url("URL de photo invalide").optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schéma pour l'inscription d'un utilisateur
 */
export const registerSchema = z
  .object({
    nom: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(100, "Le nom ne peut pas dépasser 100 caractères")
      .trim(),
    prenoms: z
      .string()
      .min(2, "Les prénoms doivent contenir au moins 2 caractères")
      .max(100, "Les prénoms ne peuvent pas dépasser 100 caractères")
      .trim(),
    email: emailSchema,
    telephone: telephoneSchema,
    sexe: sexeSchema,
    dateNaissance: dateNaissanceSchema,
    motDePasse: passwordSchema,
    confirmerMotDePasse: z.string(),
  })
  .refine((data) => data.motDePasse === data.confirmerMotDePasse, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmerMotDePasse"],
  });

/**
 * Schéma pour la connexion
 */
export const loginSchema = z.object({
  email: emailSchema,
  motDePasse: z.string().min(1, "Le mot de passe est requis"),
});

/**
 * Schéma pour le changement de mot de passe
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Les nouveaux mots de passe ne correspondent pas",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Le nouveau mot de passe doit être différent de l'ancien",
    path: ["newPassword"],
  });

/**
 * Schéma pour la réinitialisation de mot de passe
 */
export const passwordResetSchema = z.object({
  email: emailSchema,
});

/**
 * Schéma pour l'upload de photo de profil
 */
export const profilePhotoSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "La taille maximale est de 5 MB")
    .refine(
      (file) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type),
      "Format de fichier non supporté. Utilisez JPG, PNG ou WebP"
    ),
});

/**
 * Types générés à partir des schémas (pour JSDoc)
 * Utilisez ces types dans vos commentaires JSDoc pour l'autocomplétion
 *
 * @typedef {import('zod').z.infer<typeof userCreateSchema>} UserCreate
 * @typedef {import('zod').z.infer<typeof userUpdateSchema>} UserUpdate
 * @typedef {import('zod').z.infer<typeof registerSchema>} Register
 * @typedef {import('zod').z.infer<typeof loginSchema>} Login
 * @typedef {import('zod').z.infer<typeof passwordChangeSchema>} PasswordChange
 * @typedef {import('zod').z.infer<typeof passwordResetSchema>} PasswordReset
 * @typedef {import('zod').z.infer<typeof profilePhotoSchema>} ProfilePhoto
 */

export default {
  userCreateSchema,
  userUpdateSchema,
  registerSchema,
  loginSchema,
  passwordChangeSchema,
  passwordResetSchema,
  profilePhotoSchema,
};
