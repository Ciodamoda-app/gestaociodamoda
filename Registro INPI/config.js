// ==========================================
// CONFIGURAÇÃO GLOBAL DO SISTEMA (MVP)
// ==========================================

const AppConfig = {
    // Identidade do Sistema
    appName: "CoreERP",
    
    // Identidade Visual
    theme: {
        primaryColor: "#4f46e5", // Indigo 600
        logoUrl: "" // Opcional, caso queira carregar um SVG ou Imagem depois
    },

    // Dicionário de Nomenclaturas Genéricas
    dictionary: {
        clientsLabel:      "Clientes",
        suppliersLabel:    "Fornecedores",
        productsLabel:     "Produtos",
        transactionsLabel: "Transações",
        usersLabel:        "Administração",
        dashboardLabel:    "Painel Executivo",
        pdfSubtitle:       "Sistema de Gestão Comercial"
    },

    // Módulos Ativos (Feature Toggles)
    modules: {
        enableQuotes: true,        // Orçamentos
        enableSuppliers: true,     // Módulo Fornecedores
        enableCart: true           // Carrinho com múltiplos itens
    },

    // Configurações do Firebase
    firebaseConfig: {
        apiKey: "COLE_SUA_API_KEY_AQUI",
        authDomain: "COLE_SEU_AUTH_DOMAIN_AQUI",
        projectId: "COLE_SEU_PROJECT_ID_AQUI",
        storageBucket: "COLE_SEU_STORAGE_BUCKET_AQUI",
        messagingSenderId: "COLE_SEU_SENDER_ID_AQUI",
        appId: "COLE_SEU_APP_ID_AQUI",
        measurementId: "COLE_SEU_MEASUREMENT_ID_AQUI"
    }
};

// Exportando para o escopo global do navegador
window.AppConfig = AppConfig;
