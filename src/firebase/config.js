import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// === ATENÇÃO DESENVOLVEDOR ===
// As chaves da configuração do Firebase devem ser preenchidas abaixo.
// O objeto firebaseConfig deve ser acessível e isolado aqui.

export const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Variáveis para guardar as instâncias
let app;
let auth;
let db;

export function initFirebase() {
    // Inicializamos apenas se as chaves foram preenchidas pra evitar erros de compilação iniciais
    if (firebaseConfig.apiKey === "SUA_API_KEY") {
        console.warn("Firebase não inicializado. Preencha o objeto firebaseConfig em src/firebase/config.js.");
        return null;
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    return { app, auth, db };
}

export { auth, db };
