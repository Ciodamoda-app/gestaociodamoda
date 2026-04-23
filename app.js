import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, setDoc, onSnapshot, deleteDoc, query, where, getDocs, runTransaction } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
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
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'inativo') return false; 
            return data;
        }
        return false;
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
            showToast("Acesso Negado: E-mail não homologado ou pendente de ativação.", "error");
        } else {
            showToast(`Sessão Autorizada! Bem-vindo(a).`, "success");
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
    } else if (entityKey === 'transacoes') {
        thead = `<tr><th>Cód.</th><th>Data Op.</th><th>Tipo Operação</th><th>Cliente</th><th>Frente de Caixa (Itens)</th><th>Valor (R$)</th><th>Prev. Pagamento</th><th class="col-actions">Ações</th></tr>`;
    } else if (entityKey === 'usuarios_permitidos') {
        thead = `<tr><th>Credencial Associada (E-mail Base)</th><th>Privilégio / Role</th><th>Situação</th><th class="col-actions">Ações</th></tr>`;
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
        <div class="page-header" style="align-items: flex-end;">
            <div>
                <h2 class="page-title">Painel Executivo Financeiro</h2>
                <p class="page-desc">Caixa Analítico e Receituário Comercial Logístico.</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: flex-end;">
                <div>
                    <label style="font-size: 0.75rem; font-weight:600; color:var(--c-text-muted);">Competência (Mês/Ano)</label><br>
                    <input type="month" id="filtro-data-base" class="input-field" style="width: 170px; padding: 8px 12px; cursor: pointer;">
                </div>
                <button class="btn-secondary" id="btn-limpar-filtro" style="padding: 9px 12px; font-size: 0.85rem; font-weight: 700;" title="Ver Todo o Histórico">Ver Total</button>
            </div>
        </div>
        <div class="dashboard-grid grid-4">
            <div class="kpi-card">
                <span class="kpi-title">Total Geral A Receber</span>
                <span class="kpi-value info" id="dash-a-receber">R$ 0,00</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-title">Total Geral Já Recebido</span>
                <span class="kpi-value positive" id="dash-recebido">R$ 0,00</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-title">Insumos (Total a Pagar)</span>
                <span class="kpi-value" style="color:#d97706" id="dash-a-pagar">R$ 0,00</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-title">Investimento Logístico (Pago)</span>
                <span class="kpi-value negative" id="dash-pago">R$ 0,00</span>
            </div>
        </div>
        <div class="dashboard-grid grid-3" style="margin-bottom: 24px;">
            <div class="kpi-card" style="background: var(--c-brand-soft); border-color: var(--c-brand);">
                <span class="kpi-title" style="color: var(--c-brand-hover)">Total Geral Movimentado no Período</span>
                <span class="kpi-value" style="color: var(--c-brand-hover)" id="dash-total-geral">R$ 0,00</span>
            </div>
            <div class="kpi-card" style="background: #ecfdf5; border-color: var(--c-success);">
                <span class="kpi-title" style="color: #047857">Lucro Bruto Consolidado no Período</span>
                <span class="kpi-value" style="color: #047857" id="dash-lucro">R$ 0,00</span>
            </div>
            <div class="kpi-card" style="background: #fdf4ff; border-color: #d946ef;">
                <span class="kpi-title" style="color: #a21caf">Cesta de Orçamentos em Espera</span>
                <span class="kpi-value" style="color: #a21caf" id="dash-orcamento">R$ 0,00</span>
            </div>
        </div>
        <div class="bi-table-container grid-3">
            <div class="table-card">
                <div class="table-header-bar">
                    <span class="table-header-title">Fluxo de Caixa</span>
                </div>
                <div style="padding: 16px; overflow-y: auto; max-height: 400px;">
                    <table class="data-table">
                        <thead><tr><th>Q.</th><th>Status</th><th>Valor (R$)</th></tr></thead>
                        <tbody id="dash-fluxo"><td colspan="3" class="table-empty">Sincronizando BI...</td></tbody>
                    </table>
                </div>
            </div>
            <div class="table-card">
                <div class="table-header-bar">
                    <span class="table-header-title">Rentabilidade por Produto</span>
                </div>
                <div style="padding: 16px; overflow-y: auto; max-height: 400px;">
                    <table class="data-table">
                        <thead><tr><th>Produto</th><th>Invest.</th><th>Lucro</th></tr></thead>
                        <tbody id="dash-rentabilidade"><td colspan="3" class="table-empty">Calculando base...</td></tbody>
                    </table>
                </div>
            </div>
            <div class="table-card">
                <div class="table-header-bar">
                    <span class="table-header-title">Controle Logístico</span>
                </div>
                <div style="padding: 16px; overflow-y: auto; max-height: 400px;">
                    <table class="data-table">
                        <thead><tr><th>Produto/Material</th><th>Saldo Atual</th></tr></thead>
                        <tbody id="dash-estoque"><td colspan="2" class="table-empty">Sincronizando Inventário...</td></tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    clientes: () => generateListView('Clientes', 'Gerencie sua carteira, contatos B2B e endereços.', 'clientes'),
    fornecedores: () => generateListView('Fornecedores', 'Gerencie as fábricas e seus representantes parceiros.', 'fornecedores'),
    produtos: () => generateListView('Produtos em Estoque', 'Cadastro de referências, SKUs unitários e cores.', 'produtos'),
    transacoes: () => generateListView('Módulo de Transações', 'Registros corporativos de Compra (Investimento/Entrada) e Venda (Faturamento/Saída).', 'transacoes'),
    usuarios_permitidos: () => generateListView('Gestão de Usuários', 'Controle os privilégios e a ativação de colaboradores.', 'usuarios_permitidos')
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
                    window.currentUserEmail = user.email.toLowerCase(); // Cache security

                    document.getElementById('user-display-name').innerText = user.displayName || user.email.split('@')[0];
                    if (user.photoURL) document.getElementById('user-avatar').src = user.photoURL;
                    
                    const navUsers = document.getElementById('nav-sys-users');
                    if (navUsers) {
                        navUsers.style.display = isPermitido.role === 'admin' ? 'flex' : 'none';
                    }

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
    editId: null,
    dashboardDataCache: [],

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
        if (['clientes', 'fornecedores', 'produtos', 'transacoes', 'usuarios_permitidos'].includes(routeId)) {
            this.activeEntity = routeId;
            this.startReadStream(routeId);
        } else if (routeId === 'dashb') {
            this.activeEntity = null;
            this.startDashboardStream();
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
        const maskMoeda = (v) => {
            v = v.replace(/\D/g, "");
            v = (v/100).toFixed(2) + "";
            v = v.replace(".", ",");
            v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
            v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
            return "R$ " + (v === "0,00" && v.length < 5 ? "" : v);
        };

        document.querySelectorAll('input[id$="cnpj"]').forEach(el => {
            el.addEventListener('input', (e) => e.target.value = maskCNPJ(e.target.value));
        });
        document.querySelectorAll('input[id$="telefone"]').forEach(el => {
            el.addEventListener('input', (e) => e.target.value = maskTel(e.target.value));
        });
        document.querySelectorAll('input[id$="valor"]').forEach(el => {
            el.addEventListener('input', (e) => e.target.value = maskMoeda(e.target.value));
        });
    },

    openDrawer(entityKey, dataToEdit = null, docId = null) {
        this.editId = docId || null;
        const titleEl = document.getElementById('drawer-title');
        const formEl = document.getElementById('drawer-dynamic-form');
        let formHTML = '';
        const opName = docId ? "Editando" : "Novo";

        if (entityKey === 'clientes') {
            titleEl.innerText = `${opName} Cliente B2B`;
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
            titleEl.innerText = `${opName} Fornecedor`;
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
            titleEl.innerText = `${opName} Produto (SKU)`;
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
        } else if(entityKey === 'transacoes') {
            titleEl.innerText = docId ? "Editando Carrinho/Orçamento" : "Cadastrar Transação";
            window.currentCart = [];
            formHTML = `
                <div class="form-section-title">Natureza Comercial</div>
                <div class="radio-group-modern" style="grid-template-columns: repeat(3, 1fr);">
                    <label class="radio-option">
                        <input type="radio" name="tipoOp" value="compra" required checked>
                        <div class="radio-card compra">
                            <span class="material-symbols-outlined">south_west</span>
                            Entrada/Compra
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="tipoOp" value="venda" required>
                        <div class="radio-card venda">
                            <span class="material-symbols-outlined">north_east</span>
                            Saída/Venda
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="tipoOp" value="orcamento" required>
                        <div class="radio-card orcamento">
                            <span class="material-symbols-outlined">request_quote</span>
                            Orçamento
                        </div>
                    </label>
                </div>

                <div class="form-group" style="margin-top: 16px;">
                    <label>Cliente</label>
                    <input type="text" id="ipt-cliente" list="dl-clientes" class="input-field" placeholder="Digite para buscar cliente..." autocomplete="off">
                    <datalist id="dl-clientes"></datalist>
                    <span id="cliente-hint-visual" style="font-size: 0.7rem; color: var(--c-text-muted); margin-top: 4px; display:block;"></span>
                </div>
                
                <div class="form-section-title" style="margin-top:16px;">Carrinho de Itens (Lote)</div>
                <div class="cart-builder">
                    <div style="display: flex; align-items: flex-end; gap: 8px; width: 100%;">
                        <div style="flex:2;">
                            <label style="font-size: 0.7rem; color: var(--c-text-muted);">Selecione o produto</label>
                            <input type="text" id="ipt-produto" list="dl-produtos" class="input-field" placeholder="Digite para buscar produto..." autocomplete="off" style="padding: 8px;">
                            <datalist id="dl-produtos"></datalist>
                        </div>
                        <div style="flex:1;">
                            <label style="font-size: 0.7rem; color: var(--c-text-muted);">Qtd (M)</label>
                            <input type="number" id="ipt-qtd" class="input-field" placeholder="0" min="0.01" step="0.01" style="padding: 8px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size: 0.7rem; color: var(--c-text-muted);">Valor UN (R$)</label>
                            <input type="text" id="ipt-valor-un" class="input-field monetario-mask" placeholder="0,00" style="padding: 8px;">
                        </div>
                        <div>
                            <button type="button" id="btn-add-item" style="background:var(--c-brand-hover); color:white; border:none; border-radius:6px; padding:9px 12px; cursor:pointer;" title="Injetar no Carrinho">
                                <span class="material-symbols-outlined" style="font-size:18px;">add_shopping_cart</span>
                            </button>
                        </div>
                    </div>
                    
                    <table class="cart-table" style="margin-top: 12px;">
                        <thead>
                            <tr><th>Item</th><th>Metros</th><th>UN (R$)</th><th>SubTotal</th><th>X</th></tr>
                        </thead>
                        <tbody id="cart-tbody">
                            <tr><td colspan="5" style="text-align:center; color:var(--c-text-muted);">Carrinho vazio.</td></tr>
                        </tbody>
                    </table>
                    <div class="cart-info-bar">
                        CAIXA (TOTAL): <span id="cart-total-display">R$ 0,00</span>
                    </div>
                </div>

                <div class="form-row" style="margin-top: 16px;">
                    <div>
                        <label>Data Registro</label>
                        <input type="date" id="ipt-data-op" required class="input-field">
                    </div>
                    <div>
                        <label id="lbl-data-pag">Previsão de Recebimento</label>
                        <input type="date" id="ipt-data-pag" required class="input-field">
                    </div>
                </div>
            `;
            setTimeout(() => {
                const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
                document.getElementById('ipt-data-op').value = localISOTime;
                
                const rds = document.querySelectorAll('input[name="tipoOp"]');
                const updateLbl = () => {
                    const lc = document.getElementById('lbl-data-pag');
                    const clienteInput = document.getElementById('ipt-cliente');
                    const tipoVal = document.querySelector('input[name="tipoOp"]:checked').value;
                    const isC = tipoVal === 'compra';
                    if(lc) {
                        lc.innerText = isC ? 'Previsão de Pagamento' : 'Previsão de Recebimento';
                    }
                    if(clienteInput) {
                        clienteInput.disabled = isC;
                        if(isC) {
                            clienteInput.value = '';
                            clienteInput.style.background = 'var(--c-light)';
                            clienteInput.style.cursor = 'not-allowed';
                        } else {
                            clienteInput.style.background = '';
                            clienteInput.style.cursor = '';
                        }
                    }
                };
                rds.forEach(r => r.addEventListener('change', updateLbl));
                updateLbl();
                
                // Add Item Listener (Datalist-based extraction)
                document.getElementById('btn-add-item').addEventListener('click', () => {
                    const inp = document.getElementById('ipt-produto');
                    const typedVal = inp.value.trim();
                    const qtd = parseFloat(document.getElementById('ipt-qtd').value);
                    const vStr = document.getElementById('ipt-valor-un').value.replace("R$ ","").replace(/\./g, "").replace(",", ".");
                    const vun = parseFloat(vStr);
                    
                    // Buscar a option correspondente no datalist
                    const dlOpts = document.querySelectorAll('#dl-produtos option');
                    let matchedOpt = null;
                    dlOpts.forEach(o => { if(o.value === typedVal) matchedOpt = o; });
                    
                    if(!matchedOpt || isNaN(qtd) || isNaN(vun) || qtd<=0 || vun<=0) {
                        return showToast("Preencha Produto (válido da lista), Quantidade e Valor UN corretamente.", "warning");
                    }
                    
                    window.currentCart.push({
                        produtoId: matchedOpt.dataset.id,
                        produtoNome: matchedOpt.value,
                        fornecedorNome: matchedOpt.dataset.forn || '-',
                        qtd: qtd,
                        vun: vun,
                        subTotal: qtd * vun
                    });
                    
                    document.getElementById('ipt-qtd').value = '';
                    document.getElementById('ipt-valor-un').value = '';
                    inp.value = '';
                    window.DB_Core.renderCartTable();
                });
            }, 50);
            this.populateProdutosSelect();
        } else if (entityKey === 'usuarios_permitidos') {
            titleEl.innerText = docId ? "Editando Role de Segurança" : "Homologar Novo Operador";
            const isEditingId = docId ? 'readonly style="background: var(--c-light); cursor:not-allowed;"' : '';
            formHTML = `
                <div class="form-section-title">Credenciais Base</div>
                <div class="form-group">
                    <label>E-mail Corporativo (Google)</label>
                    <input type="email" id="ipt-email" ${isEditingId} required class="input-field" placeholder="gestor@ciodamoda.com">
                </div>
                <div class="form-row">
                    <div>
                        <label>Privilégio (Role)</label>
                        <select id="ipt-role" required class="input-field">
                            <option value="comum">Operador Comum</option>
                            <option value="admin">Administrador Geral</option>
                        </select>
                    </div>
                    <div>
                        <label>Status</label>
                        <select id="ipt-status" required class="input-field">
                            <option value="ativo" selected>Usuário ATIVO</option>
                            <option value="inativo">Conta BLOQUEADA</option>
                        </select>
                    </div>
                </div>
            `;
        }

        formEl.innerHTML = formHTML;
        this.applyMasks();
        
        if (entityKey === 'transacoes' || entityKey === 'produtos') {
            const preSelect = dataToEdit ? (dataToEdit.fornecedorId || dataToEdit.produtoId) : null;
            if (entityKey === 'produtos') this.populateFornecedoresSelect(preSelect);
            else {
                this.populateProdutosSelect(preSelect);
                this.populateClientesDatalist(dataToEdit?.clienteId || null);
            }
        }

        if (dataToEdit) {
            setTimeout(() => {
                for(let key in dataToEdit) {
                    let ipt = document.getElementById(`ipt-${key}`);
                    if (ipt && key!=='timestamp' && ipt.type!=='radio') {
                        ipt.value = dataToEdit[key];
                        // Trigger input to fix formatting
                        ipt.dispatchEvent(new Event('input'));
                    }
                }
                
                // Specific Transaction Edition (Carrinho mapping)
                if (entityKey === 'transacoes') {
                    if (dataToEdit.tipo) {
                        const rdo = document.querySelector(`input[name="tipoOp"][value="${dataToEdit.tipo}"]`);
                        if(rdo) {
                            rdo.checked = true;
                            rdo.dispatchEvent(new Event('change'));
                        }
                    }
                    
                    // Fallback to old scalar mode gracefully OR popuplate new map array
                    window.currentCart = dataToEdit.itens ? [...dataToEdit.itens] : [{
                        produtoId: dataToEdit.produtoId,
                        produtoNome: dataToEdit.produtoNome,
                        fornecedorNome: dataToEdit.fornecedorNome,
                        qtd: dataToEdit.qtd,
                        vun: (dataToEdit.valorTotal / dataToEdit.qtd) || 0,
                        subTotal: dataToEdit.valorTotal
                    }];
                    window.DB_Core.renderCartTable();
                }
            }, 100);
        }

        this.toggleDrawer(true);
    },

    renderCartTable() {
        const tb = document.getElementById('cart-tbody');
        const totEl = document.getElementById('cart-total-display');
        if(!tb) return;
        
        if(!window.currentCart || window.currentCart.length === 0) {
            tb.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--c-text-muted);">Cesto Vazio.</td></tr>';
            if(totEl) totEl.innerText = 'R$ 0,00';
            return;
        }
        
        tb.innerHTML = '';
        let bigT = 0;
        window.currentCart.forEach((it, idx) => {
            bigT += (it.subTotal || 0);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600; font-size:0.75rem;">${it.produtoNome}</td>
                <td style="font-weight:600;">${it.qtd} M</td>
                <td style="font-family:monospace; color:var(--c-text-muted);">${(it.vun||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td style="font-weight:700; color:var(--c-brandHover);">${(it.subTotal||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td><button type="button" class="btn-rmv material-symbols-outlined" data-idx="${idx}" title="Retirar Item">delete</button></td>
            `;
            tb.appendChild(tr);
        });
        
        if(totEl) totEl.innerText = bigT.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
        
        tb.querySelectorAll('.btn-rmv').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = e.currentTarget.getAttribute('data-idx');
                window.currentCart.splice(i, 1);
                this.renderCartTable(); // call re-render self
            });
        });
    },

    async populateFornecedoresSelect(preSelect = null) {
        if (!db) return;
        try {
            const { getDocs, runTransaction } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
            const snap = await getDocs(collection(db, 'fornecedores'));
            const select = document.getElementById('ipt-fornecedor');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecione um fornecedor da lista</option>';
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.text = data.fantasia || data.razao || doc.id;
                    if(preSelect === doc.id) opt.selected = true;
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
            } else if (this.activeEntity === 'transacoes') {
                if(!window.currentCart || window.currentCart.length === 0) {
                    showToast("Por favor, preencha o carrinho com no mínimo 1 (um) item.", "error");
                    return toggleGlobalLoader(false);
                }

                const tipoOp = document.querySelector('input[name="tipoOp"]:checked').value;

                // Validação: Cliente obrigatório para Venda e Orçamento
                if (tipoOp === 'venda' || tipoOp === 'orcamento') {
                    const clienteCheck = document.getElementById('ipt-cliente');
                    if (!clienteCheck || !clienteCheck.value.trim()) {
                        showToast("O campo Cliente é obrigatório para operações de Venda e Orçamento.", "error");
                        return toggleGlobalLoader(false);
                    }
                }

                const reqs = {};
                window.currentCart.forEach(i => { reqs[i.produtoId] = (reqs[i.produtoId] || 0) + i.qtd; });
                
                // Validação Logística Anti-Negativa em Lote
                if (tipoOp === 'venda' || tipoOp === 'orcamento') {
                    const snapV = await getDocs(collection(db, 'transacoes'));
                    const estoqueMap = {};
                    snapV.forEach(dx => {
                        const tr = dx.data();
                        if (this.editId && dx.id === this.editId) return;
                        if (tr.tipo === 'orcamento') return;
                        
                        const ls = tr.itens || [{ produtoId: tr.produtoId, qtd: tr.qtd }];
                        ls.forEach(it => {
                            if(!it.produtoId) return;
                            if(!estoqueMap[it.produtoId]) estoqueMap[it.produtoId] = 0;
                            estoqueMap[it.produtoId] += (tr.tipo === 'compra') ? it.qtd : -it.qtd;
                        });
                    });
                    
                    for(let pId in reqs) {
                        const saldo = estoqueMap[pId] || 0;
                        if (reqs[pId] > saldo) {
                            if (tipoOp === 'venda') {
                                showToast(`Operação Negada! Produto sem saldo suficiente. Resta base ${saldo} Metros.`, "error");
                                return toggleGlobalLoader(false);
                            } else {
                                if(!confirm(`Atenção de Rito: Algum produto orçado possui saldo insuficiente em nuvem (Base real atualizada: ${saldo}M). Deseja manter o Orçamento em espera?`)) {
                                    return toggleGlobalLoader(false);
                                }
                            }
                        }
                    }
                }
                
                // Extrair Cliente do Datalist
                const clienteInput = document.getElementById('ipt-cliente');
                const clienteTyped = clienteInput ? clienteInput.value.trim() : '';
                let clienteId = '', clienteNome = '';
                if(clienteTyped) {
                    const clOpts = document.querySelectorAll('#dl-clientes option');
                    clOpts.forEach(o => { if(o.value === clienteTyped) { clienteId = o.dataset.id; clienteNome = o.value; } });
                    if(!clienteId) clienteNome = clienteTyped; // permite nome livre se não casar com datalist
                }

                payload = {
                    tipo: tipoOp,
                    itens: window.currentCart,
                    valorTotal: window.currentCart.reduce((a,b)=>a+b.subTotal, 0),
                    clienteId: clienteId,
                    clienteNome: clienteNome,
                    dataOp: document.getElementById('ipt-data-op').value,
                    dataPag: document.getElementById('ipt-data-pag').value,
                    timestamp: new Date()
                };
            } else if (this.activeEntity === 'usuarios_permitidos') {
                const em = document.getElementById('ipt-email').value.trim().toLowerCase();
                payload = {
                    email: em,
                    role: document.getElementById('ipt-role').value,
                    status: document.getElementById('ipt-status').value,
                    timestamp: new Date()
                };
                
                // Seguranca Anti-Morte Admin
                if (this.editId && em === window.currentUserEmail && payload.status === 'inativo') {
                    showToast("Trava corporativa: Não é possível inativar/bloquear a si próprio em sessão.", "error");
                    return toggleGlobalLoader(false);
                }
            }

            // Push or Update Firestore
            if (this.activeEntity === 'usuarios_permitidos') {
                await setDoc(doc(db, "usuarios_permitidos", payload.email), payload);
                showToast(this.editId ? "Acessos atualizados na nuvem!" : "Novo usuário homologado com sucesso!", "success");
            } else if (this.editId) {
                await updateDoc(doc(db, this.activeEntity, this.editId), payload);
                showToast("Registro ATUALIZADO em nuvem com sucesso!", "success");
            } else {
                if (this.activeEntity === 'transacoes') { // Auto-Incrementador de Série
                    const counterRef = doc(db, 'metadata', 'counters');
                    const cType = payload.tipo;
                    const nextNum = await runTransaction(db, async (t) => {
                        const sfDoc = await t.get(counterRef);
                        let n = 1;
                        if (!sfDoc.exists()) {
                            t.set(counterRef, { [cType]: 1 });
                        } else {
                            n = (sfDoc.data()[cType] || 0) + 1;
                            t.update(counterRef, { [cType]: n });
                        }
                        return n;
                    });
                    const px = cType === 'venda' ? 'VEN' : (cType === 'compra' ? 'COM' : 'ORC');
                    payload.codigo = `${px}-${nextNum.toString().padStart(4, '0')}`;
                }
                await addDoc(collection(db, this.activeEntity), payload);
                showToast("Registro criado nativamente e salvo em nuvem com sucesso!", "success");
            }
            
            this.editId = null;
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
                } else if (collectionName === 'transacoes') {
                    const isCompra = data.tipo === 'compra';
                    const isOrca = data.tipo === 'orcamento';
                    let badgeClass = 'badge-success';
                    let icon = 'south_west';
                    let trLabel = 'COMPRA';
                    if(isOrca) { badgeClass = 'badge-neutral'; icon = 'request_quote'; trLabel = 'ORÇAMENTO'; }
                    else if(!isCompra) { badgeClass = 'badge-info'; icon = 'north_east'; trLabel = 'VENDA'; }
                    
                    const valFormat = (data.valorTotal || 0).toLocaleString('pt-BR', {style: 'currency', currency:'BRL'});
                    const cd = data.codigo || '-';
                    
                    let arrItens = data.itens || (data.produtoNome ? [{produtoNome: data.produtoNome, qtd: data.qtd}] : []);
                    let f_str = arrItens.map(i => `<span style="display:inline-block; margin-bottom:2px;">${i.qtd} Mts x <span style="font-weight:600">${i.produtoNome}</span></span>`).join('<br>');
                    
                    tr.innerHTML = `
                        <td style="font-weight: 700; color:var(--c-text-muted);">${cd}</td>
                        <td style="font-weight: 500;">${data.dataOp.split('-').reverse().join('/')}</td>
                        <td><span class="badge ${badgeClass}" style="display:inline-flex; gap:4px; align-items:center;"><span class="material-symbols-outlined" style="font-size:12px;">${icon}</span> ${trLabel}</span></td>
                        <td style="font-size: 0.85rem; font-weight: 500;">${data.clienteNome || '-'}</td>
                        <td style="font-size: 0.75rem; line-height: 1.2;">${f_str}</td>
                        <td style="font-family: monospace; font-weight:600;">${valFormat}</td>
                        <td style="color: var(--c-text-muted); font-size:0.85rem;">${data.dataPag.split('-').reverse().join('/')}</td>
                    `;
                } else if (collectionName === 'usuarios_permitidos') {
                    const st = data.status === 'ativo' ? '<span class="badge badge-success">ATIVO</span>' : '<span class="badge badge-neutral" style="background:#fecdd3;color:#881337;">INATIVO</span>';
                    const rl = data.role === 'admin' ? '<span style="color:var(--c-brandHover);font-weight:700;">Administrador</span>' : '<span style="color:var(--c-text-muted);">Comum</span>';
                    tr.innerHTML = `
                        <td style="font-weight:600; font-size:0.9rem;">${data.email || docSnap.id}</td>
                        <td>${rl}</td>
                        <td>${st}</td>
                    `;
                }

                // Injeção da Coluna de Ações
                const tdAction = document.createElement('td');
                tdAction.className = "col-actions";
                const printBtnHTML = (collectionName === 'transacoes' && (data.tipo === 'venda' || data.tipo === 'orcamento'))
                    ? `<button class="btn-icon print js-print" data-id="${docSnap.id}" title="Imprimir PDF">
                            <span class="material-symbols-outlined">print</span>
                       </button>`
                    : '';
                tdAction.innerHTML = `
                    ${printBtnHTML}
                    <button class="btn-icon js-edit" data-id="${docSnap.id}">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn-icon danger js-del" data-id="${docSnap.id}">
                        <span class="material-symbols-outlined">delete_outline</span>
                    </button>
                `;

                tr.appendChild(tdAction);

                // Binding Print, Edit e DeleteDoc
                const printBtnEl = tdAction.querySelector('.js-print');
                if (printBtnEl) {
                    printBtnEl.addEventListener('click', () => {
                        this.generateTransactionPDF(data);
                    });
                }

                tdAction.querySelector('.js-edit').addEventListener('click', () => {
                    this.openDrawer(collectionName, data, docSnap.id);
                });
                
                tdAction.querySelector('.js-del').addEventListener('click', async () => {
                    if (collectionName === 'usuarios_permitidos' && docSnap.id === window.currentUserEmail) {
                        showToast("Trava corporativa: Não é possível excluir a própria conta logada do ecossistema.", "error");
                        return;
                    }
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
    },

    async populateProdutosSelect(preSelect = null) {
        if(!db) return;
        try {
            const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
            const snap = await getDocs(collection(db, 'produtos'));
            const dl = document.getElementById('dl-produtos');
            const inp = document.getElementById('ipt-produto');
            if(dl) {
                dl.innerHTML = '';
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = data.nome || doc.id;
                    opt.dataset.id = doc.id;
                    opt.dataset.forn = data.fornecedorNome || '-';
                    dl.appendChild(opt);
                });
            }
            if(inp && preSelect) {
                // Preencher o input com o nome do produto pré-selecionado
                const matchOpt = dl?.querySelector(`option[data-id="${preSelect}"]`);
                if(matchOpt) inp.value = matchOpt.value;
            }
        } catch(e) {
            console.error(e);
        }
    },

    async populateClientesDatalist(preSelectId = null) {
        if(!db) return;
        try {
            const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
            const snap = await getDocs(collection(db, 'clientes'));
            const dl = document.getElementById('dl-clientes');
            const inp = document.getElementById('ipt-cliente');
            if(dl) {
                dl.innerHTML = '';
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = data.fantasia || data.razao || doc.id;
                    opt.dataset.id = doc.id;
                    dl.appendChild(opt);
                });
            }
            if(inp && preSelectId) {
                const matchOpt = dl?.querySelector(`option[data-id="${preSelectId}"]`);
                if(matchOpt) inp.value = matchOpt.value;
            }
        } catch(e) {
            console.error(e);
        }
    },

    startDashboardStream() {
        if(!db) return;
        
        const filtro = document.getElementById('filtro-data-base');
        const btnLimpar = document.getElementById('btn-limpar-filtro');
        
        if (filtro) {
            filtro.addEventListener('change', () => this.renderBI());
        }
        if (btnLimpar && filtro) {
            btnLimpar.addEventListener('click', () => { 
                filtro.value = ''; 
                this.renderBI(); 
            });
        }

        this.unsubscribeCurrent = onSnapshot(collection(db, 'transacoes'), (snapshot) => {
            this.dashboardDataCache = [];
            snapshot.forEach(docSnap => {
                this.dashboardDataCache.push({ id: docSnap.id, ...docSnap.data() });
            });
            this.renderBI();
        }, (error) => { console.error("BI erro:", error); });
    },

    renderBI() {
        const tbodyEstoque = document.getElementById('dash-estoque');
        const tbodyFluxo = document.getElementById('dash-fluxo');
        const tbodyRent = document.getElementById('dash-rentabilidade');
        const filtroM = document.getElementById('filtro-data-base')?.value; 
        
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const hojeISO = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
        
        let aPagar = 0, pago = 0, aReceber = 0, recebido = 0, aOrcamento = 0;
        const estoqueMap = {};
        const rentMap = {};
        let fluxoList = [];
        let totalMovimentado = 0;

        this.dashboardDataCache.forEach(d => {
            const isCompra = d.tipo === 'compra';
            const isOrca = d.tipo === 'orcamento';
            const dPeriodo = d.dataPag.substring(0, 7);
            const inPeriod = (!filtroM || dPeriodo === filtroM);

            if(isOrca) {
                if(inPeriod) aOrcamento += (d.valorTotal || 0);
                return; // Pula cálculos financeiros e logísticos
            }
            
            // Retro-compatibilidade do Lote Logístico
            const mItens = d.itens || [{produtoId: d.produtoId, produtoNome: d.produtoNome, qtd: d.qtd, subTotal: d.valorTotal}];
            mItens.forEach(it => {
                if(!it.produtoId) return;
                
                if(!estoqueMap[it.produtoId]) estoqueMap[it.produtoId] = { nome: it.produtoNome, saldo: 0 };
                if(isCompra) estoqueMap[it.produtoId].saldo += it.qtd;
                else estoqueMap[it.produtoId].saldo -= it.qtd;
                
                if(!rentMap[it.produtoId]) rentMap[it.produtoId] = { nome: it.produtoNome, inv: 0, luc: 0 };
                if(isCompra) rentMap[it.produtoId].inv += (it.subTotal || 0);
                else rentMap[it.produtoId].luc += (it.subTotal || 0);
            });

            // Filtros Temporais Globais
            if(!inPeriod) return;

            const isPago = d.dataPag <= hojeISO;
            totalMovimentado += (d.valorTotal || 0);

            if(isCompra) {
                if(isPago) pago += d.valorTotal; else aPagar += d.valorTotal;
            } else {
                if(isPago) recebido += d.valorTotal; else aReceber += d.valorTotal;
            }
            fluxoList.push({...d, isQuitado: isPago, itLength: mItens.length, pName: mItens[0]?.produtoNome, clienteNome: d.clienteNome || ''});
        });

        const cBRL = (val) => val.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        const el = (id) => document.getElementById(id);
        
        if(el('dash-a-receber')) el('dash-a-receber').innerText = cBRL(aReceber);
        if(el('dash-recebido')) el('dash-recebido').innerText = cBRL(recebido);
        if(el('dash-a-pagar')) el('dash-a-pagar').innerText = cBRL(aPagar);
        if(el('dash-pago')) el('dash-pago').innerText = cBRL(pago);
        if(el('dash-total-geral')) el('dash-total-geral').innerText = cBRL(totalMovimentado);
        if(el('dash-lucro')) el('dash-lucro').innerText = cBRL((recebido + aReceber) - (pago + aPagar));
        if(el('dash-orcamento')) el('dash-orcamento').innerText = cBRL(aOrcamento);

        fluxoList.sort((a,b) => new Date(a.dataPag) - new Date(b.dataPag));
        if(tbodyFluxo) {
            tbodyFluxo.innerHTML = '';
            if(fluxoList.length === 0) tbodyFluxo.innerHTML = '<tr><td colspan="3" class="table-empty">Sem fluxo financeiro.</td></tr>';
            fluxoList.slice(0, 50).forEach(cx => {
                const isC = cx.tipo === 'compra';
                let stBadge = '';
                if(isC) stBadge = cx.isQuitado ? '<span class="badge badge-success">PAGO</span>' : '<span class="badge badge-neutral">A PAGAR</span>';
                else stBadge = cx.isQuitado ? '<span class="badge badge-success" style="background:#0284c7;color:white;">RECEBIDO</span>' : '<span class="badge badge-info">A RECEBER</span>';

                const tr = document.createElement('tr');
                tr.className = "clickable-row";
                tr.innerHTML = `
                    <td style="font-size:0.85rem">${cx.dataPag.split('-').reverse().join('/')}</td>
                    <td>${stBadge}</td>
                    <td style="font-family:monospace; font-weight:600; ${isC ? 'color:var(--c-danger)':'color:var(--c-success)'};">${isC ? '-' : '+'}${cBRL(cx.valorTotal)}</td>
                `;
                
                tr.addEventListener('click', () => {
                    const md = document.getElementById('generic-modal');
                    const mb = document.getElementById('modal-body');
                    if(md && mb) {
                        mb.innerHTML = `
                            <div class="modal-kv"><span class="modal-kv-key">Status Financeiro</span><span class="modal-kv-val">${stBadge}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Cliente</span><span class="modal-kv-val">${cx.clienteNome || 'Não informado'}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Recorte do Lote Interno</span><span class="modal-kv-val">${cx.pName} ${cx.itLength>1 ? `(+${cx.itLength-1} outros)`:''}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Natureza / Transação</span><span class="modal-kv-val">${isC ? 'Compra (Custo)' : 'Venda (Faturamento)'}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Valor Agregado (BR)</span><span class="modal-kv-val">${cBRL(cx.valorTotal)}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Data Base Mestre</span><span class="modal-kv-val">${cx.dataOp.split('-').reverse().join('/')}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Vencimento</span><span class="modal-kv-val">${cx.dataPag.split('-').reverse().join('/')}</span></div>
                        `;
                        md.classList.add('open');
                    }
                });
                tbodyFluxo.appendChild(tr);
            });
        }
        
        if(tbodyRent) {
            tbodyRent.innerHTML = '';
            const rents = Object.values(rentMap);
            if(rents.length === 0) tbodyRent.innerHTML = '<tr><td colspan="3" class="table-empty">Sem faturamento aparente.</td></tr>';
            rents.forEach(r => {
                const perc = r.inv > 0 ? ((r.luc - r.inv) / r.inv * 100).toFixed(0) : 100;
                tbodyRent.innerHTML += `
                    <tr>
                        <td style="font-weight:600; font-size:0.85rem;">${r.nome}</td>
                        <td style="font-family:monospace; color:var(--c-text-muted);">${cBRL(r.inv)}</td>
                        <td style="font-family:monospace; font-weight:700; ${r.luc >= r.inv ? 'color:var(--c-success)' : 'color:var(--c-danger)'};">${cBRL(r.luc - r.inv)} <span style="font-size:0.75rem;">(${perc}%)</span></td>
                    </tr>
                `;
            });
        }

        if(tbodyEstoque) {
            tbodyEstoque.innerHTML = '';
            const skus = Object.values(estoqueMap);
            if(skus.length === 0) tbodyEstoque.innerHTML = '<tr><td colspan="2" class="table-empty">Logística Ociosa.</td></tr>';
            skus.forEach(sk => {
                const st = sk.saldo < 0 ? 'color:var(--c-danger)' : (sk.saldo > 0 ? 'color:var(--c-success)' : '');
                tbodyEstoque.innerHTML += `
                    <tr>
                        <td style="font-weight:600; font-size:0.85rem">${sk.nome}</td>
                        <td style="font-family:monospace; font-weight:700; ${st}">${sk.saldo} Metros</td>
                    </tr>
                `;
            });
        }
    },

    generateTransactionPDF(data) {
        if (!window.jspdf) {
            showToast("Biblioteca de PDF não carregada. Recarregue a página.", "error");
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = 25;

        const isVenda = data.tipo === 'venda';
        const titulo = isVenda ? 'VENDA' : 'ORÇAMENTO';
        const codigo = data.codigo || '-';

        // === CABEÇALHO ===
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(79, 70, 229);
        pdf.text('CioDaModa', margin, y);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text('Sistema de Gestão Comercial', margin, y + 5);

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(titulo, pageWidth - margin, y, { align: 'right' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Código: ${codigo}`, pageWidth - margin, y + 5, { align: 'right' });
        pdf.text(`Data Op.: ${data.dataOp ? data.dataOp.split('-').reverse().join('/') : '-'}`, pageWidth - margin, y + 10, { align: 'right' });
        y += 18;

        // Linha divisória
        pdf.setDrawColor(79, 70, 229);
        pdf.setLineWidth(0.6);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 12;

        // === CLIENTE ===
        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Cliente:', margin, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(data.clienteNome || 'Não informado', margin + 22, y);
        y += 12;

        // === TABELA DE PRODUTOS ===
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Produtos:', margin, y);
        y += 8;

        // Header da tabela
        pdf.setFillColor(241, 245, 249);
        pdf.rect(margin, y - 5, contentWidth, 8, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 116, 139);
        pdf.text('PRODUTO', margin + 3, y);
        pdf.text('QTD (M)', margin + 95, y);
        pdf.text('VALOR UN', margin + 120, y);
        pdf.text('SUBTOTAL', margin + 148, y);
        y += 5;

        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 6;

        // Itens
        const itens = data.itens || [];
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(51, 65, 85);

        itens.forEach((item, idx) => {
            if (y > 250) {
                pdf.addPage();
                y = 25;
            }
            // Zebra striping
            if (idx % 2 === 0) {
                pdf.setFillColor(248, 250, 252);
                pdf.rect(margin, y - 4, contentWidth, 7, 'F');
            }
            pdf.setTextColor(51, 65, 85);
            pdf.text(item.produtoNome || '-', margin + 3, y);
            pdf.text(`${item.qtd}`, margin + 95, y);
            pdf.text((item.vun || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), margin + 120, y);
            pdf.setFont('helvetica', 'bold');
            pdf.text((item.subTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), margin + 148, y);
            pdf.setFont('helvetica', 'normal');
            y += 7;
        });

        // Linha total
        y += 3;
        pdf.setDrawColor(79, 70, 229);
        pdf.setLineWidth(0.6);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 8;

        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text('VALOR TOTAL:', margin, y);
        pdf.setTextColor(79, 70, 229);
        pdf.text((data.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), pageWidth - margin, y, { align: 'right' });
        y += 12;

        // Data de Pagamento (especialmente para Orçamento)
        if (data.dataPag) {
            pdf.setFontSize(12);
            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            const lblPag = isVenda ? 'Previsão de Recebimento:' : 'Data de Pagamento:';
            pdf.text(lblPag, margin, y);
            pdf.setFont('helvetica', 'normal');
            pdf.text(data.dataPag.split('-').reverse().join('/'), margin + 62, y);
            y += 14;
        }

        // === ÁREA DE ASSINATURAS ===
        y = Math.max(y + 20, 230);

        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.3);

        const sigW = 65;
        const sigLeftX = margin + 8;
        const sigRightX = pageWidth - margin - sigW - 8;

        // Assinatura Cliente
        pdf.line(sigLeftX, y, sigLeftX + sigW, y);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text('Nome: _______________________________', sigLeftX, y + 6);
        pdf.text('CPF/CNPJ: ___________________________', sigLeftX, y + 12);
        pdf.text('Data: ____/____/________', sigLeftX, y + 18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text('CLIENTE', sigLeftX + sigW / 2, y + 25, { align: 'center' });

        // Assinatura Vendedor
        pdf.line(sigRightX, y, sigRightX + sigW, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text('Nome: _______________________________', sigRightX, y + 6);
        pdf.text('CPF/CNPJ: ___________________________', sigRightX, y + 12);
        pdf.text('Data: ____/____/________', sigRightX, y + 18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text('VENDEDOR', sigRightX + sigW / 2, y + 25, { align: 'center' });

        // Rodapé
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(180, 180, 180);
        pdf.text('CioDaModa - Sistema de Gestão Comercial | Documento gerado automaticamente', pageWidth / 2, 290, { align: 'center' });

        // Salvar
        pdf.save(`${titulo}_${codigo}_${data.dataOp || 'sem-data'}.pdf`);
        showToast("PDF gerado com sucesso!", "success");
    }
};
