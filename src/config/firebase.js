import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Configuration Firebase depuis les variables d'environnement
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Vérifier que les variables d'environnement sont définies
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  console.warn(
    `⚠️ Variables d'environnement Firebase manquantes: ${missingVars.join(", ")}`
  );
  console.warn(
    "Firebase ne sera pas initialisé correctement. Vérifiez votre fichier .env"
  );
}

// Initialiser Firebase
let app;
let auth;
let db;
let rtdb;
let storage;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);
  storage = getStorage(app);

  // Analytics uniquement en production
  if (import.meta.env.VITE_APP_ENV === "production") {
    analytics = getAnalytics(app);
  }

  console.log("✅ Firebase initialisé avec succès");
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation de Firebase:", error);
}

// Exporter les instances
export { app, auth, db, rtdb, storage, analytics };

// Exporter des helpers utiles
export const isFirebaseConfigured = () => {
  return missingVars.length === 0;
};
