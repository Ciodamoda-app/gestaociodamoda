import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-analytics.js";

// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAmp83VFJo6u3uffqviTLW_CTTKLMCus7g",
    authDomain: "ciodamoda-69283.firebaseapp.com",
    projectId: "ciodamoda-69283",
    storageBucket: "ciodamoda-69283.firebasestorage.app",
    messagingSenderId: "973007239262",
    appId: "1:973007239262:web:c2203326675e54baf69ccf",
    measurementId: "G-WH24TW2SYB"
};


let app, auth, db, analytics;
const provider = new GoogleAuthProvider();

// ==========================================
// 2. UTILITÁRIOS GERAIS DE UI (Tailwind Toasts)
// ==========================================
function showToast(message, type = "error") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const div = document.createElement('div');
    const isError = type === 'error';

    // Classes Tailwind para o Toast
    div.className = `toast-animate-in flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        } min-w-[300px] pointer-events-auto`;

    div.innerHTML = `
        <span class="material-symbols-outlined ${isError ? 'text-red-500' : 'text-emerald-500'}">
            ${isError ? 'cancel' : 'check_circle'}
        </span>
        <span class="font-medium text-sm">${message}</span>
    `;

    container.appendChild(div);

    setTimeout(() => {
        div.classList.replace('toast-animate-in', 'toast-animate-out');
        setTimeout(() => div.remove(), 300);
    }, 4000);
}

function setActionLoading(isLoading) {
    const btnGoogle = document.getElementById('btn-login-google');
    const loadingView = document.getElementById('login-loading');

    if (isLoading) {
        btnGoogle.classList.add('hidden');
        loadingView.classList.remove('hidden');
    } else {
        btnGoogle.classList.remove('hidden');
        loadingView.classList.add('hidden');
    }
}

function toggleGlobalLoader(show) {
    const loader = document.getElementById('loader-overlay');
    if (show) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    } else {
        loader.classList.add('hidden');
        loader.classList.remove('flex');
    }
}

// ==========================================
// 3. NÚCLEO DE AUTENTICAÇÃO E ACESSO
// ==========================================
async function checkAccessLevel(email) {
    if (!db) return false;
    try {
        // Regra de Negócio: procura na coleção "usuarios_permitidos" por um DOC ID igual ao email
        const userRef = doc(db, "usuarios_permitidos", email);
        const snap = await getDoc(userRef);
        return snap.exists();
    } catch (e) {
        console.error("Erro na verificação do Firestore:", e);
        return false;
    }
}

async function handleGoogleLogin() {
    if (firebaseConfig.apiKey === "SUA_API_KEY") {
        showToast("Firebase Config incompleto! Preencha em app.js", "error");
        return;
    }

    try {
        setActionLoading(true);
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const isAllowed = await checkAccessLevel(user.email);

        if (!isAllowed) {
            await signOut(auth);
            setActionLoading(false);
            showToast("Acesso Negado! O seu e-mail não consta na base de permissões.", "error");
            return;
        }

        // Login Completo - UI update será engatilhado no onAuthStateChanged
        showToast("Seja bem-vindo(a)!", "success");
    } catch (error) {
        setActionLoading(false);
        showToast("Erro durante a autenticação: " + error.code, "error");
    }
}

// ==========================================
// 4. ENGINE DE ROTEAMENTO (SPA ROUTER)
// ==========================================
const SPA = {
    currentRoute: null,

    async navigate(routeId) {
        if (this.currentRoute === routeId) return;

        toggleGlobalLoader(true);

        // Atualiza UI de Menus Laterais (marcando Ativo vizualmente)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-white/10', 'text-white', 'border-blue-500');
            btn.classList.add('border-transparent', 'text-slate-400');

            if (btn.getAttribute('data-route') === routeId) {
                btn.classList.add('bg-white/10', 'text-white', 'border-blue-500');
                btn.classList.remove('border-transparent', 'text-slate-400');
            }
        });

        const appMainContent = document.getElementById('app-main-content');

        try {
            // Trazemos o arquivo .html correspodente do protótipo
            const response = await fetch(`${routeId}.html`);
            if (!response.ok) throw new Error("Rota não encontrada");

            const htmlText = await response.text();

            // Fazemos um Parsing silencioso do HTML para arrancar Apenas a tag <main>
            const parser = new DOMParser();
            const docFragment = parser.parseFromString(htmlText, 'text/html');
            const newMain = docFragment.querySelector('main');

            if (newMain) {
                appMainContent.innerHTML = newMain.outerHTML;
            } else {
                appMainContent.innerHTML = `<main class="ml-[280px] mt-16 p-lg text-center opacity-50">Main content not found</main>`;
            }

            this.currentRoute = routeId;

        } catch (e) {
            showToast(`Falha ao carregar vista estática: ${e.message}`, "error");
        } finally {
            toggleGlobalLoader(false);
        }
    },

    bindEvents() {
        document.body.addEventListener('click', (e) => {
            // Intercepta clicks nos links da sidebar
            const navBtn = e.target.closest('.nav-btn');
            if (navBtn) {
                e.preventDefault();
                this.navigate(navBtn.getAttribute('data-route'));
            }
        });
    }
};

// ==========================================
// 5. INICIALIZAÇÃO DA APLICAÇÃO (BOOTSTRAP)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

    // Inicia Firebase se apiKey não for Dummy
    if (firebaseConfig.apiKey !== "SUA_API_KEY") {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        if (firebaseConfig.measurementId) {
            analytics = getAnalytics(app);
        }
    }

    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');

    // Liga Eventos Global (Clicks Menu)
    SPA.bindEvents();

    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            toggleGlobalLoader(true);

            if (user) {
                // Checagem constante - Se revogar no backend, kickamos na próxima sessão de reload local
                const isPermitido = await checkAccessLevel(user.email);

                if (!isPermitido) {
                    await signOut(auth);
                } else {
                    // Update User Info TopBar
                    document.getElementById('user-display-name').innerText = user.displayName || user.email.split('@')[0];
                    if (user.photoURL) document.getElementById('user-avatar').src = user.photoURL;

                    // Muta Telas
                    loginView.classList.add('hidden');
                    appView.classList.remove('hidden');

                    // Restaura estado inicial de App (Dashboard principal)
                    SPA.navigate('dashb');
                }
            } else {
                // Estado desconectado
                loginView.classList.remove('hidden');
                appView.classList.add('hidden');
                setActionLoading(false);
            }

            toggleGlobalLoader(false);
        });
    } else {
        // Sem firebase, tira loader de cena para mostrar erro UI e para de carregar
        toggleGlobalLoader(false);
        loginView.classList.remove('hidden');
    }

    // Ações Fixadas
    const btnGoogle = document.getElementById('btn-login-google');
    if (btnGoogle) {
        btnGoogle.addEventListener('click', handleGoogleLogin);
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (auth) signOut(auth);
        });
    }
});
