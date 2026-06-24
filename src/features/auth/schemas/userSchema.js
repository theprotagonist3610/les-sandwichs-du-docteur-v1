import { z } from "zod";

const sexeSchema = z.enum(["Homme", "Femme", "Autre"], {
  errorMap: () => ({ message: "Veuillez sélectionner un sexe valide" }),
});

const roleSchema = z.enum(["admin", "superviseur", "vendeur"], {
  errorMap: () => ({ message: "Rôle invalide" }),
});

const telephoneSchema = z
  .string()
  .min(10, "Le numéro de téléphone doit contenir au moins 10 chiffres")
  .regex(
    /^\+\d{1,4}\d{10}$/,
    "Le numéro de téléphone doit être au format international (+indicatif + 10 chiffres)"
  );

const emailSchema = z.string().email("Email invalide").toLowerCase().trim();

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)/,
    "Le mot de passe doit contenir au moins une lettre et un chiffre"
  );

const dateNaissanceSchema = z
  .string()
  .refine((date) => {
    const age = new Date().getFullYear() - new Date(date).getFullYear();
    return age >= 16 && age <= 100;
  }, "Vous devez avoir au moins 16 ans")
  .or(
    z.date().refine((date) => {
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 16 && age <= 100;
    }, "Vous devez avoir au moins 16 ans")
  );

export const userCreateSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100).trim(),
  prenoms: z.string().min(2, "Les prénoms doivent contenir au moins 2 caractères").max(100).trim(),
  email: emailSchema,
  telephone: telephoneSchema,
  sexe: sexeSchema,
  dateNaissance: dateNaissanceSchema,
  role: roleSchema.default("vendeur"),
});

export const userUpdateSchema = z.object({
  nom: z.string().min(2).max(100).trim().optional(),
  prenoms: z.string().min(2).max(100).trim().optional(),
  email: emailSchema.optional(),
  telephone: telephoneSchema.optional(),
  sexe: sexeSchema.optional(),
  dateNaissance: dateNaissanceSchema.optional(),
  role: roleSchema.optional(),
  photoUrl: z.string().url("URL de photo invalide").optional(),
  isActive: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100).trim(),
    prenoms: z.string().min(2, "Les prénoms doivent contenir au moins 2 caractères").max(100).trim(),
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

export const loginSchema = z.object({
  email: emailSchema,
  motDePasse: z.string().min(1, "Le mot de passe est requis"),
});

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

export const passwordResetSchema = z.object({
  email: emailSchema,
});

export const profilePhotoSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "La taille maximale est de 5 MB")
    .refine(
      (file) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type),
      "Format de fichier non supporté. Utilisez JPG, PNG ou WebP"
    ),
});
