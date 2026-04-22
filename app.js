import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-analytics.js";

// ==========================================
// 1. CONFIGURAÇÃO (O Usuário Vai Injetar a Chave)
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

// ==========================================
// 2. INICIALIZAÇÃO FIREBASE (Protegida)
// ==========================================
let app, auth, db, analytics;

try {
    if (firebaseConfig.apiKey !== "SUA_API_KEY") {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        if (firebaseConfig.measurementId) analytics = getAnalytics(app);
    } else {
        console.warn("ATENÇÃO: as chaves do firebaseConfig não foram preenchidas no app.js.");
    }
} catch (error) {
    console.error("Erro fatal ao iniciar Firebase:", error);
}

// ==========================================
// 3. UTILS UI E CONTROLE DE ACESSO
// ==========================================

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'check_circle' : 'error';
    const color = type === 'success' ? 'var(--c-success)' : 'var(--c-danger)';

    toast.innerHTML = `
        <span class="material-symbols-outlined" style="color: ${color}">${icon}</span>
        <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function toggleGlobalLoader(show) {
    const loader = document.getElementById('global-loader');
    if (loader) {
        if (show) loader.classList.add('active');
        else loader.classList.remove('active');
    }
}

async function checkAccessLevel(emailCheck) {
    if (!db) return true; // bypass if no DB
    try {
        const userRef = doc(db, "usuarios_permitidos", emailCheck.toLowerCase());
        const docSnap = await getDoc(userRef);
        return docSnap.exists();
    } catch (e) {
        console.error("Erro na verificação de acesso:", e);
        return false;
    }
}

async function handleGoogleLogin() {
    if (!auth) {
        showToast("Você precisa preencher as chaves no app.js!", "error");
        return;
    }

    toggleGlobalLoader(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const isPermitido = await checkAccessLevel(user.email);

        if (!isPermitido) {
            await signOut(auth);
            showToast("Acesso Negado: E-mail não consta na coleção usuarios_permitidos.", "error");
        } else {
            showToast(`Bem-vindo, ${user.displayName || 'Gestor'}!`, "success");
        }
    } catch (error) {
        showToast("Erro durante autenticação: " + error.code, "error");
    } finally {
        toggleGlobalLoader(false);
    }
}

// ==========================================
// 4. MOTOR DE VIRTUAL DOM (SPA)
// ==========================================

function generateListView(title, desc, entityKey) {
    let thead = '';
    if (entityKey === 'clientes') {
        thead = `<tr><th>Razão Social</th><th>Fantasia</th><th>CNPJ</th><th>Telefone</th><th class="col-actions">Ações</th></tr>`;
    } else if (entityKey === 'fornecedores') {
        thead = `<tr><th>Fantasia</th><th>CNPJ</th><th>Telefone</th><th>Vendedor</th><th class="col-actions">Ações</th></tr>`;
    } else if (entityKey === 'produtos') {
        thead = `<tr><th style="width: 60px; text-align: center;"><span class="material-symbols-outlined text-[18px]">image</span></th><th>Produto</th><th>Fornecedor</th><th>Cor</th><th>Unidade</th><th class="col-actions">Ações</th></tr>`;
    }

    return `
        <div class="page-header">
            <div>
                <h2 class="page-title">${title}</h2>
                <p class="page-desc">${desc}</p>
            </div>
            <button class="btn-primary btn-new" data-entity="${entityKey}">
                <span class="material-symbols-outlined">add</span> Novo Registro
            </button>
        </div>
        <div class="table-card">
            <div class="table-header-bar">
                <span class="table-header-title">Listagem Ativa</span>
                <span id="counter-${entityKey}" class="badge badge-neutral">Sincronizando...</span>
            </div>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>${thead}</thead>
                    <tbody id="tbody-${entityKey}">
                        <tr><td colspan="6" class="table-empty">
                            <div style="display:flex; flex-direction:column; align-items:center; opacity:0.5;">
                                <span class="material-symbols-outlined" style="font-size:32px; margin-bottom:8px">sync</span>
                                Aguardando dados...
                            </div>
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

const ViewTemplates = {
    dashb: () => `
        <div class="page-header">
            <div>
                <h2 class="page-title">Dashboard Operacional</h2>
                <p class="page-desc">Visão panorâmica do seu ecossistema</p>
            </div>
        </div>
        <div class="glass-panel" style="padding: 64px 32px; text-align: center; color: var(--c-text-muted); border-radius: var(--radius-md);">
            <span class="material-symbols-outlined" style="font-size: 64px; color: var(--c-brand-soft); margin-bottom: 24px;">insights</span>
            <h3 style="font-size: 1.5rem; color: var(--c-dark); margin-bottom: 8px;">Bem-vindo ao Painel Executivo</h3>
            <p>Os módulos de banco de dados e roteamento nativos estão 100% operantes.</p>
        </div>
    `,
    clientes: () => generateListView('Clientes', 'Gerencie sua carteira, contatos B2B e endereços.', 'clientes'),
    fornecedores: () => generateListView('Fornecedores', 'Gerencie as fábricas e seus representantes parceiros.', 'fornecedores'),
    produtos: () => generateListView('Produtos em Estoque', 'Cadastro de referências, SKUs unitários e cores.', 'produtos')
};

const SPA = {
    currentRoute: null,
    navigate(routeId) {
        if (this.currentRoute === routeId) return;

        // Atualiza estado visual no menu lateral
        document.querySelectorAll('.nav-link').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-route') === routeId) {
                btn.classList.add('active');
            }
        });

        const appMainContent = document.getElementById('app-main-content');

        // Injeta a Template
        if (ViewTemplates[routeId]) {
            appMainContent.innerHTML = ViewTemplates[routeId]();
        } else {
            appMainContent.innerHTML = `<h2>Vista '${routeId}' não mapeada.</h2>`;
        }

        this.currentRoute = routeId;

        // Dispara bind do Back-end
        window.DB_Core.initModule(routeId);
    },

    bindEvents() {
        document.body.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                e.preventDefault();
                this.navigate(navLink.getAttribute('data-route'));
            }
        });
    }
};

// ==========================================
// 5. BOOTSTRAP DE ESTADO (AUTH INIT)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // Esconder views no init
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');

    SPA.bindEvents();

    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            toggleGlobalLoader(true);

            if (user) {
                const isPermitido = await checkAccessLevel(user.email);
                if (!isPermitido) {
                    await signOut(auth);
                } else {
                    document.getElementById('user-display-name').innerText = user.displayName || user.email.split('@')[0];
                    if (user.photoURL) document.getElementById('user-avatar').src = user.photoURL;

                    loginView.classList.add('hidden');
                    appView.classList.remove('hidden');

                    SPA.navigate('dashb');
                }
            } else {
                loginView.classList.remove('hidden');
                appView.classList.add('hidden');
            }
            toggleGlobalLoader(false);
        });
    } else {
        toggleGlobalLoader(false);
        loginView.classList.remove('hidden');
    }

    const btnGoogle = document.getElementById('btn-login-google');
    if (btnGoogle) { btnGoogle.addEventListener('click', handleGoogleLogin); }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) { btnLogout.addEventListener('click', () => { if (auth) signOut(auth); }); }
});

// ==========================================
// 6. DB_CORE (Firestore Controllers)
// ==========================================

window.DB_Core = {
    unsubscribeCurrent: null,
    activeEntity: null,

    initModule(routeId) {
        if (this.unsubscribeCurrent) {
            this.unsubscribeCurrent();
            this.unsubscribeCurrent = null;
        }

        // Se a vista contém botões "Novo" ativamos listeners
        const btnNew = document.querySelector('.btn-new');
        if (btnNew) {
            btnNew.addEventListener('click', (e) => this.openDrawer(e.currentTarget.getAttribute('data-entity')));
        }

        // Fechamentos do modal
        const closeBtn = document.getElementById('btn-close-drawer');
        const cancelBtn = document.getElementById('btn-cancel-drawer');
        const saveBtn = document.getElementById('btn-save-drawer');

        // Remove old listeners cloning node (Tricky vanilla solution para matar eventListeners antigos soltos)
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => this.handleSave());

        closeBtn.onclick = () => this.toggleDrawer(false);
        cancelBtn.onclick = () => this.toggleDrawer(false);

        // Dispara leituras se for rota de tabela (Entity Keys batem com collections Firestore)
        if (['clientes', 'fornecedores', 'produtos'].includes(routeId)) {
            this.activeEntity = routeId;
            this.startReadStream(routeId);
        } else {
            this.activeEntity = null;
        }
    },

    toggleDrawer(show) {
        const overlay = document.getElementById('global-drawer');
        if (show) overlay.classList.add('open');
        else overlay.classList.remove('open');
    },

    applyMasks() {
        const maskCNPJ = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").slice(0, 18);
        const maskTel = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4,5})(\d)/, "$1-$2").slice(0, 15);

        document.querySelectorAll('input[id$="cnpj"]').forEach(el => {
            el.addEventListener('input', (e) => e.target.value = maskCNPJ(e.target.value));
        });
        document.querySelectorAll('input[id$="telefone"]').forEach(el => {
            el.addEventListener('input', (e) => e.target.value = maskTel(e.target.value));
        });
    },

    openDrawer(entityKey) {
        const titleEl = document.getElementById('drawer-title');
        const formEl = document.getElementById('drawer-dynamic-form');
        let formHTML = '';

        if (entityKey === 'clientes') {
            titleEl.innerText = "Novo Cliente B2B";
            formHTML = `
                <div class="form-section-title">Dados de Registro</div>
                <div class="form-group">
                    <label>Razão Social</label>
                    <input type="text" id="ipt-razao" required class="input-field" placeholder="Ex: Corporação S.A.">
                </div>
                <div class="form-group">
                    <label>Nome Fantasia</label>
                    <input type="text" id="ipt-fantasia" required class="input-field" placeholder="Ex: Corp Brands">
                </div>
                <div class="form-row">
                    <div>
                        <label>CNPJ</label>
                        <input type="text" id="ipt-cnpj" required class="input-field" placeholder="00.000.000/0000-00" maxlength="18">
                    </div>
                    <div>
                        <label>E-mail Pessoal / Corporativo</label>
                        <input type="email" id="ipt-email" required class="input-field" placeholder="contato@empresa.com">
                    </div>
                </div>
                <div class="form-row">
                    <div>
                        <label>Insc. Estadual (IE)</label>
                        <input type="text" id="ipt-ie" class="input-field" placeholder="Opcional">
                    </div>
                    <div>
                        <label>Telefone Principal</label>
                        <input type="text" id="ipt-telefone" required class="input-field" placeholder="(00) 00000-0000" maxlength="15">
                    </div>
                </div>
                <div class="form-section-title" style="margin-top: 32px;">Operacional</div>
                <div class="form-group">
                    <label>Nome do Comprador(a)</label>
                    <input type="text" id="ipt-comprador" required class="input-field" placeholder="Responsável pelas requisições">
                </div>
                <div class="form-group">
                    <label>Endereço de Entrega/Faturamento</label>
                    <input type="text" id="ipt-endereco" required class="input-field" placeholder="Seu local logístico completo">
                </div>
            `;
        } else if (entityKey === 'fornecedores') {
            titleEl.innerText = "Homologar Fornecedor";
            formHTML = `
                <div class="form-section-title">Dados Matriz</div>
                <div class="form-group">
                    <label>Razão Social</label>
                    <input type="text" id="ipt-razao" required class="input-field" placeholder="Ex: Têxtil Fibras S.A.">
                </div>
                <div class="form-group">
                    <label>Nome Fantasia</label>
                    <input type="text" id="ipt-fantasia" required class="input-field" placeholder="Ex: Fio Mágico">
                </div>
                <div class="form-row">
                    <div>
                        <label>CNPJ</label>
                        <input type="text" id="ipt-cnpj" required class="input-field" placeholder="00.000.000/0000-00" maxlength="18">
                    </div>
                    <div>
                        <label>Inscrição Estadual</label>
                        <input type="text" id="ipt-ie" class="input-field" placeholder="Opcional / Isento">
                    </div>
                </div>
                <div class="form-group">
                    <label>Endereço Completo</label>
                    <input type="text" id="ipt-endereco" required class="input-field" placeholder="Endereço logístico/fábrica">
                </div>
                <div class="form-section-title" style="margin-top: 32px;">Representação Comercial</div>
                <div class="form-row">
                    <div>
                        <label>Vendedor Atribuído</label>
                        <input type="text" id="ipt-vendedor" required class="input-field" placeholder="Nome do representante base">
                    </div>
                    <div>
                        <label>Qualificação / Cargo</label>
                        <input type="text" id="ipt-contato" required class="input-field" placeholder="Ex: Gerente Região Sul">
                    </div>
                </div>
                <div class="form-row">
                    <div>
                        <label>WhatsApp / Celular</label>
                        <input type="text" id="ipt-telefone" required class="input-field" placeholder="(00) 00000-0000" maxlength="15">
                    </div>
                    <div>
                        <label>E-mail Direto</label>
                        <input type="email" id="ipt-email" required class="input-field" placeholder="comercial@fornecedor.com">
                    </div>
                </div>
            `;
        } else if (entityKey === 'produtos') {
            titleEl.innerText = "Registrar Produto (SKU)";
            formHTML = `
                <div class="form-section-title">Definições Logísticas</div>
                <div class="form-group">
                    <label>Descrição do Produto</label>
                    <input type="text" id="ipt-nome" required class="input-field" placeholder="Ex: Malha Premium Tubolar Branca Mod. 01">
                </div>
                <div class="form-group">
                    <label>Fornecedor de Origem (Vinculação)</label>
                    <select id="ipt-fornecedor" required class="input-field">
                        <option value="" disabled selected>Buscando na base de dados...</option>
                    </select>
                </div>
                <div class="form-row">
                    <div>
                        <label>Cor Padrão Operacional</label>
                        <input type="text" id="ipt-cor" required class="input-field" placeholder="Visual (Ex: Naval / Cru)">
                    </div>
                    <div>
                        <label>Unidade Base (UM)</label>
                        <input type="text" id="ipt-unidade" class="input-field" value="metros" readonly>
                    </div>
                </div>
            `;
            this.populateFornecedoresSelect();
        }

        formEl.innerHTML = formHTML;
        this.applyMasks();
        this.toggleDrawer(true);
    },

    async populateFornecedoresSelect() {
        if (!db) return;
        try {
            // Usa getDocs genérico assíncrono para dropdowns
            const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
            const snap = await getDocs(collection(db, 'fornecedores'));
            const select = document.getElementById('ipt-fornecedor');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecione um fornecedor da lista</option>';
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.text = data.fantasia || data.razao || doc.id;
                    select.appendChild(opt);
                });
            }
        } catch (e) {
            console.error(e);
        }
    },

    async handleSave() {
        if (!db) return;
        const formEl = document.getElementById('drawer-dynamic-form');
        if (!formEl.reportValidity()) return; // Validação HTML5 nativa trava o envio se campos required nao tiverem preenchidos

        toggleGlobalLoader(true);
        let payload = {};

        try {
            if (this.activeEntity === 'clientes') {
                payload = {
                    razao: document.getElementById('ipt-razao').value,
                    fantasia: document.getElementById('ipt-fantasia').value,
                    cnpj: document.getElementById('ipt-cnpj').value,
                    email: document.getElementById('ipt-email').value,
                    ie: document.getElementById('ipt-ie').value,
                    telefone: document.getElementById('ipt-telefone').value,
                    comprador: document.getElementById('ipt-comprador').value,
                    endereco: document.getElementById('ipt-endereco').value,
                    timestamp: new Date()
                };
            } else if (this.activeEntity === 'fornecedores') {
                payload = {
                    razao: document.getElementById('ipt-razao').value,
                    fantasia: document.getElementById('ipt-fantasia').value,
                    cnpj: document.getElementById('ipt-cnpj').value,
                    ie: document.getElementById('ipt-ie').value,
                    endereco: document.getElementById('ipt-endereco').value,
                    vendedor: document.getElementById('ipt-vendedor').value,
                    contato: document.getElementById('ipt-contato').value,
                    telefone: document.getElementById('ipt-telefone').value,
                    email: document.getElementById('ipt-email').value,
                    timestamp: new Date()
                };
            } else if (this.activeEntity === 'produtos') {
                const selForn = document.getElementById('ipt-fornecedor');
                payload = {
                    nome: document.getElementById('ipt-nome').value,
                    fornecedorId: selForn.value,
                    fornecedorNome: selForn.options[selForn.selectedIndex].text,
                    cor: document.getElementById('ipt-cor').value,
                    unidade_medida: document.getElementById('ipt-unidade').value,
                    timestamp: new Date()
                };
            }

            // Realiza push no Firestore (A listagem puxa via onSnapshot automaticamente)
            await addDoc(collection(db, this.activeEntity), payload);

            showToast("Registro criado nativamente e salvo em nuvem com sucesso!", "success");
            this.toggleDrawer(false);

        } catch (e) {
            showToast("Falha de gravação: " + e.message, "error");
        } finally {
            toggleGlobalLoader(false);
        }
    },

    startReadStream(collectionName) {
        if (!db) return;
        const tbody = document.getElementById(`tbody-${collectionName}`);
        const countSpan = document.getElementById(`counter-${collectionName}`);
        if (!tbody) return;

        this.unsubscribeCurrent = onSnapshot(collection(db, collectionName), (snapshot) => {
            tbody.innerHTML = '';

            if (snapshot.empty) {
                tbody.innerHTML = `<tr><td colspan="6" class="table-empty">O banco de dados de ${collectionName} está vazio.</td></tr>`;
                if (countSpan) countSpan.innerText = "0 registros encontrados";
                return;
            }

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const tr = document.createElement('tr');

                // Mapeamento dinâmico de colunas (Glassmorphism tr hover via CSS .data-table tbody tr:hover)
                if (collectionName === 'clientes') {
                    tr.innerHTML = `
                        <td style="font-weight: 600;">${data.razao || '-'}</td>
                        <td>${data.fantasia || '-'}</td>
                        <td style="font-family: monospace; color: var(--c-text-muted);">${data.cnpj || '-'}</td>
                        <td style="font-family: monospace;">${data.telefone || '-'}</td>
                    `;
                } else if (collectionName === 'fornecedores') {
                    tr.innerHTML = `
                        <td style="font-weight: 600;">${data.fantasia || '-'}</td>
                        <td style="font-family: monospace; color: var(--c-text-muted);">${data.cnpj || '-'}</td>
                        <td style="font-family: monospace;">${data.telefone || '-'}</td>
                        <td><span class="badge badge-info">${data.vendedor || '-'}</span></td>
                    `;
                } else if (collectionName === 'produtos') {
                    tr.innerHTML = `
                        <td style="text-align: center;"><div style="width:36px; height:36px; background:var(--c-light); border-radius:6px; display:inline-flex; align-items:center; justify-content:center; color:var(--c-text-muted); border:1px solid var(--c-border);"><span class="material-symbols-outlined" style="font-size:18px;">category</span></div></td>
                        <td style="font-weight: 600;">${data.nome || '-'}</td>
                        <td>${data.fornecedorNome || '-'}</td>
                        <td>${data.cor || '-'}</td>
                        <td><span class="badge badge-neutral">${data.unidade_medida || 'metros'}</span></td>
                    `;
                }

                // Injeção da Coluna de Deletar Centralizada
                const tdAction = document.createElement('td');
                tdAction.className = "col-actions";
                tdAction.innerHTML = `
                    <button class="btn-icon danger js-del" data-id="${docSnap.id}">
                        <span class="material-symbols-outlined">delete_outline</span>
                    </button>
                `;

                tr.appendChild(tdAction);

                // Binding do Câmbio DeleteDoc
                tdAction.querySelector('.js-del').addEventListener('click', async () => {
                    if (confirm("Confirma a exclusão deste item corporativo? Esta ação é irreversível e ocorrerá em nuvem na hora.")) {
                        try {
                            await deleteDoc(doc(db, collectionName, docSnap.id));
                            showToast("Objeto deletado na nuvem Firestore", "success");
                        } catch (err) {
                            showToast("Falha " + err.message, "error");
                        }
                    }
                });

                tbody.appendChild(tr);
            });

            if (countSpan) countSpan.innerText = `${snapshot.size} fluxo(s) sincronizado(s)`;

        }, (error) => {
            showToast("Falha de Escuta Snapshot DB: " + error.message, "error");
        });
    }
};
