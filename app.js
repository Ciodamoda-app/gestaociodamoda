import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
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
    } else if (entityKey === 'transacoes') {
        thead = `<tr><th>Data Op.</th><th>Tipo</th><th>Produto</th><th>Qtd.</th><th>Valor (R$)</th><th>Prev. Pagamento</th><th class="col-actions">Ações</th></tr>`;
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
            <div>
                <label style="font-size: 0.75rem; font-weight:600; color:var(--c-text-muted);">Competência (Mês/Ano)</label><br>
                <input type="month" id="filtro-data-base" class="input-field" style="width: 200px; padding: 8px 12px; cursor: pointer;">
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
        <div class="dashboard-grid grid-2" style="margin-bottom: 24px;">
            <div class="kpi-card" style="background: var(--c-brand-soft); border-color: var(--c-brand);">
                <span class="kpi-title" style="color: var(--c-brand-hover)">Total Geral Movimentado no Período</span>
                <span class="kpi-value" style="color: var(--c-brand-hover)" id="dash-total-geral">R$ 0,00</span>
            </div>
            <div class="kpi-card" style="background: #ecfdf5; border-color: var(--c-success);">
                <span class="kpi-title" style="color: #047857">Lucro Bruto Consolidado no Período</span>
                <span class="kpi-value" style="color: #047857" id="dash-lucro">R$ 0,00</span>
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
    transacoes: () => generateListView('Módulo de Transações', 'Registros corporativos de Compra (Investimento/Entrada) e Venda (Faturamento/Saída).', 'transacoes')
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
        if (['clientes', 'fornecedores', 'produtos', 'transacoes'].includes(routeId)) {
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
            titleEl.innerText = docId ? "Editando Transação" : "Registrar Nova Operação";
            formHTML = `
                <div class="form-section-title">Natureza da Transação</div>
                <div class="radio-group-modern">
                    <label class="radio-option">
                        <input type="radio" name="tipoOp" value="compra" required checked>
                        <div class="radio-card compra">
                            <span class="material-symbols-outlined">south_west</span>
                            Entrada (Compra)
                        </div>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="tipoOp" value="venda" required>
                        <div class="radio-card venda">
                            <span class="material-symbols-outlined">north_east</span>
                            Saída (Venda)
                        </div>
                    </label>
                </div>
                <div class="form-group">
                    <label>Produto Envolvido</label>
                    <select id="ipt-produto" required class="input-field">
                        <option value="" disabled selected>Buscando inventário em nuvem...</option>
                    </select>
                    <div id="forn-hint-visual" style="margin-top: 8px; font-size: 0.8rem; font-weight: 600; color: var(--c-brand);"></div>
                </div>
                <div class="form-row">
                    <div>
                        <label>Quantidade (em Metros)</label>
                        <input type="number" id="ipt-qtd" required class="input-field" placeholder="0" min="1" step="0.01">
                    </div>
                    <div>
                        <label>Valor Total (R$)</label>
                        <input type="text" id="ipt-valor" required class="input-field" placeholder="R$ 0,00">
                    </div>
                </div>
                <div class="form-row">
                    <div>
                        <label>Data da Operação</label>
                        <input type="date" id="ipt-data-op" required class="input-field">
                    </div>
                    <div>
                        <label>Previs. Pagamento/Recebimento</label>
                        <input type="date" id="ipt-data-pag" required class="input-field">
                    </div>
                </div>
            `;
            setTimeout(() => {
                const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
                document.getElementById('ipt-data-op').value = localISOTime;
            }, 50);
            this.populateProdutosSelect();
        }

        formEl.innerHTML = formHTML;
        this.applyMasks();
        
        if (entityKey === 'transacoes' || entityKey === 'produtos') {
            const preSelect = dataToEdit ? (dataToEdit.fornecedorId || dataToEdit.produtoId) : null;
            if (entityKey === 'produtos') this.populateFornecedoresSelect(preSelect);
            else this.populateProdutosSelect(preSelect);
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
                
                // Specific Transaction Edition
                if (entityKey === 'transacoes') {
                    if (dataToEdit.tipo) {
                        const rdo = document.querySelector(`input[name="tipoOp"][value="${dataToEdit.tipo}"]`);
                        if(rdo) rdo.checked = true;
                    }
                    if (dataToEdit.valorTotal) {
                        const valIpt = document.getElementById('ipt-valor');
                        valIpt.value = (dataToEdit.valorTotal * 100).toString(); // raw mock for strict BRL function
                        valIpt.dispatchEvent(new Event('input'));
                    }
                }
            }, 100);
        }

        this.toggleDrawer(true);
    },

    async populateFornecedoresSelect(preSelect = null) {
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
                const selProd = document.getElementById('ipt-produto');
                const optSelect = selProd.options[selProd.selectedIndex];
                const fornecedorOp = optSelect.dataset.forn || '-';
                const vlrStr = document.getElementById('ipt-valor').value.replace("R$ ","").replace(/\./g, "").replace(",", ".");
                
                payload = {
                    tipo: document.querySelector('input[name="tipoOp"]:checked').value,
                    produtoId: selProd.value,
                    produtoNome: optSelect.text,
                    fornecedorNome: fornecedorOp,
                    qtd: parseFloat(document.getElementById('ipt-qtd').value),
                    valorTotal: parseFloat(vlrStr),
                    dataOp: document.getElementById('ipt-data-op').value,
                    dataPag: document.getElementById('ipt-data-pag').value,
                    timestamp: new Date()
                };
            }

            // Push or Update Firestore
            if (this.editId) {
                await updateDoc(doc(db, this.activeEntity, this.editId), payload);
                showToast("Registro ATUALIZADO em nuvem com sucesso!", "success");
            } else {
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
                    const iconColor = isCompra ? 'color: var(--c-success);' : 'color: var(--c-brand);';
                    const icon = isCompra ? 'south_west' : 'north_east';
                    const trLabel = isCompra ? 'COMPRA' : 'VENDA';
                    const valFormat = (data.valorTotal || 0).toLocaleString('pt-BR', {style: 'currency', currency:'BRL'});
                    
                    tr.innerHTML = `
                        <td style="font-weight: 500;">${data.dataOp.split('-').reverse().join('/')}</td>
                        <td><span class="badge ${isCompra ? 'badge-success' : 'badge-info'}" style="display:inline-flex; gap:4px; align-items:center;"><span class="material-symbols-outlined" style="font-size:12px;">${icon}</span> ${trLabel}</span></td>
                        <td style="font-weight: 600;">${data.produtoNome}</td>
                        <td>${data.qtd}</td>
                        <td style="font-family: monospace; font-weight:600;">${valFormat}</td>
                        <td style="color: var(--c-text-muted); font-size:0.85rem;">${data.dataPag.split('-').reverse().join('/')}</td>
                    `;
                }

                // Injeção da Coluna de Deletar Centralizada
                const tdAction = document.createElement('td');
                tdAction.className = "col-actions";
                tdAction.innerHTML = `
                    <button class="btn-icon js-edit" data-id="${docSnap.id}">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn-icon danger js-del" data-id="${docSnap.id}">
                        <span class="material-symbols-outlined">delete_outline</span>
                    </button>
                `;

                tr.appendChild(tdAction);

                // Binding Edit e DeleteDoc
                tdAction.querySelector('.js-edit').addEventListener('click', () => {
                    this.openDrawer(collectionName, data, docSnap.id);
                });
                
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
    },

    async populateProdutosSelect(preSelect = null) {
        if(!db) return;
        try {
            const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
            const snap = await getDocs(collection(db, 'produtos'));
            const select = document.getElementById('ipt-produto');
            if(select) {
                select.innerHTML = '<option value="" disabled selected>Selecione um Sku na base</option>';
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.text = data.nome || doc.id;
                    opt.dataset.forn = data.fornecedorNome || '-';
                    if(preSelect === doc.id) opt.selected = true;
                    select.appendChild(opt);
                });
                
                // Visual Hint
                select.onchange = (e) => {
                    const h = document.getElementById('forn-hint-visual');
                    const o = e.target.options[e.target.selectedIndex];
                    if(h && o) h.innerText = "Fornecedor da Operação: " + (o.dataset.forn || '-');
                };
                if(preSelect) select.dispatchEvent(new Event('change'));
            }
        } catch(e) {
            console.error(e);
        }
    },

    startDashboardStream() {
        if(!db) return;
        
        // Auto-select current mês 
        const d = new Date();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const filtro = document.getElementById('filtro-data-base');
        if(filtro && !filtro.value) filtro.value = `${d.getFullYear()}-${m}`;
        
        if (filtro) {
            filtro.addEventListener('change', () => this.renderBI());
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
        
        let aPagar = 0, pago = 0, aReceber = 0, recebido = 0;
        const estoqueMap = {};
        const rentMap = {};
        let fluxoList = [];
        let totalMovimentado = 0;

        this.dashboardDataCache.forEach(d => {
            // Estoque Histórico
            if(!estoqueMap[d.produtoId]) estoqueMap[d.produtoId] = { nome: d.produtoNome, saldo: 0 };
            if(d.tipo === 'compra') estoqueMap[d.produtoId].saldo += d.qtd;
            else estoqueMap[d.produtoId].saldo -= d.qtd;
            
            // Rentabilidade (Histórico Base)
            if(!rentMap[d.produtoId]) rentMap[d.produtoId] = { nome: d.produtoNome, inv: 0, luc: 0 };
            if(d.tipo === 'compra') rentMap[d.produtoId].inv += d.valorTotal;
            else rentMap[d.produtoId].luc += d.valorTotal;

            // Filtros Temporais para os Quadros Principais
            const dPeriodo = d.dataPag.substring(0, 7);
            if(filtroM && dPeriodo !== filtroM) return;

            const isPago = d.dataPag <= hojeISO;
            totalMovimentado += d.valorTotal;

            if(d.tipo === 'compra') {
                if(isPago) pago += d.valorTotal; else aPagar += d.valorTotal;
            } else {
                if(isPago) recebido += d.valorTotal; else aReceber += d.valorTotal;
            }
            fluxoList.push({...d, isQuitado: isPago});
        });

        const cBRL = (val) => val.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        const el = (id) => document.getElementById(id);
        
        if(el('dash-a-receber')) el('dash-a-receber').innerText = cBRL(aReceber);
        if(el('dash-recebido')) el('dash-recebido').innerText = cBRL(recebido);
        if(el('dash-a-pagar')) el('dash-a-pagar').innerText = cBRL(aPagar);
        if(el('dash-pago')) el('dash-pago').innerText = cBRL(pago);
        if(el('dash-total-geral')) el('dash-total-geral').innerText = cBRL(totalMovimentado);
        if(el('dash-lucro')) el('dash-lucro').innerText = cBRL((recebido + aReceber) - (pago + aPagar));

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
                            <div class="modal-kv"><span class="modal-kv-key">Produto/Serviço</span><span class="modal-kv-val">${cx.produtoNome}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Fornecedor Logístico</span><span class="modal-kv-val">${cx.fornecedorNome || '-'}</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Volume Tangível</span><span class="modal-kv-val">${cx.qtd} Metros</span></div>
                            <div class="modal-kv"><span class="modal-kv-key">Natureza/Transação</span><span class="modal-kv-val">${isC ? 'Compra (Custo)' : 'Venda (Faturamento)'}</span></div>
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
    }
};
