import { initFirebase } from "./src/firebase/config.js";
import { loginWithGoogle, logout, monitorAuthState } from "./src/firebase/auth.js";
import { hideLoader, showLoader } from "./src/components/ui.js";

// === INICIALIZAÇÃO ===
document.addEventListener("DOMContentLoaded", () => {
    // Inicializar Firebase
    const firebaseInstances = initFirebase();

    // Referências de DOM
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const btnLoginGoogle = document.getElementById('btn-login-google');
    const btnLogout = document.getElementById('btn-logout');
    
    // Usuário UI
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');

    // Sidebar & Menus
    const btnMenuToggle = document.getElementById('btn-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('content-area');
    const moduleTitle = document.getElementById('current-module-title');

    // Estado local da UI
    let currentUser = null;

    // Se Firebase não configurado, apenas removemos o loader p/ ver a tela de login
    if (!firebaseInstances) {
        hideLoader();
    } else {
        // Monitora Estado Global de Autenticação
        monitorAuthState(
            // Ao logar
            (user) => {
                currentUser = user;
                showDashboard(user);
            },
            // Ao deslogar
            () => {
                currentUser = null;
                showLogin();
            }
        );
    }

    // Ações de Botão
    if (btnLoginGoogle) {
        btnLoginGoogle.addEventListener('click', () => {
            loginWithGoogle();
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            logout();
        });
    }

    // Ações do Sidebar Menu
    if (btnMenuToggle && sidebar) {
        btnMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Troca de módulos do dashboard
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active style
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Troca Titulo e simula carregamento do módulo
            const moduleName = item.getAttribute('data-module');
            const moduleText = item.querySelector('span:nth-child(2)').innerText;
            moduleTitle.innerText = moduleText;

            renderModule(moduleName);

            // Fechar sidebar no mobile se estiver aberta
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Funções controladoras de View
    function showDashboard(user) {
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
        userName.innerText = user.displayName || 'Administrador';
        userEmail.innerText = user.email;

        // Render Início default
        renderModule('inicio');
    }

    function showLogin() {
        dashboardView.classList.add('hidden');
        loginView.classList.remove('hidden');
    }

    function renderModule(moduleName) {
        // Simulação básica de roteamento modular estático injetando HTML ou exibindo divs.
        let htmlContent = '';
        
        switch(moduleName) {
            case 'inicio':
                htmlContent = `
                    <div class="module-content">
                        <h3>Visão Geral</h3>
                        <p>Bem-vindo ao dashboard principal! Tudo está operando normalmente.</p>
                    </div>
                `;
                break;
            case 'inventario':
                htmlContent = `
                    <div class="module-content">
                        <h3>Gestão de Inventário</h3>
                        <p>Aqui você poderá ver e gerenciar os produtos da CioDaModa.</p>
                    </div>
                `;
                break;
            case 'configuracoes':
                htmlContent = `
                    <div class="module-content">
                        <h3>Configurações do Sistema</h3>
                        <p>Ajustes de firebase e propriedades do portal.</p>
                    </div>
                `;
                break;
            default:
                htmlContent = `<div class="module-content"><p>Módulo não encontrado.</p></div>`;
        }

        contentArea.innerHTML = htmlContent;
    }
});
