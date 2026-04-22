import { 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { auth, db } from "./config.js";
import { showToast, showLoader, hideLoader } from "../components/ui.js";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
    if (!auth) {
        showToast("Firebase não configurado. Verifique o config.js", "error");
        return;
    }

    try {
        showLoader();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Verifica no Firestore se o email existe na coleção
        const isAllowed = await checkUserAccess(user.email);
        
        if (!isAllowed) {
            // Se não for permitido, desloga imediatamente
            await logout();
            hideLoader();
            showToast("Acesso Negado. Você não tem permissão para entrar.", "error");
            return;
        }

        // Sucesso
        showToast("Login efetuado com sucesso!", "success");
        // Quando onAuthStateChanged pegar logado, main.js cuidará da UI
        
    } catch (error) {
        hideLoader();
        console.error("Erro no login:", error);
        showToast("Falha na autenticação: " + error.message, "error");
    }
}

export async function logout() {
    if (auth) {
        await signOut(auth);
    }
}

async function checkUserAccess(email) {
    if (!db) return false;

    try {
        // Assume que o ID do documento da coleção 'usuarios_permitidos' é o próprio email do usuário.
        const userRef = doc(db, "usuarios_permitidos", email);
        const userSnap = await getDoc(userRef);
        
        return userSnap.exists();
    } catch (error) {
        console.error("Erro ao verificar acesso no Firestore:", error);
        return false;
    }
}

export function monitorAuthState(onLogin, onLogout) {
    if (!auth) return;
    
    onAuthStateChanged(auth, async (user) => {
        showLoader();
        
        if (user) {
            // Dupla checagem: mesmo se mantiver sessão viva, se o admin revogar o user,
            // ao atualizar a página ele será deslogado
            const isAllowed = await checkUserAccess(user.email);
            if (!isAllowed) {
                await logout();
                onLogout();
                showToast("Sua permissão de acesso expirou ou foi revogada.", "error");
            } else {
                onLogin(user);
            }
        } else {
            onLogout();
        }
        
        hideLoader();
    });
}
