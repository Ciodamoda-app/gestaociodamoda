# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language / Idioma

- Sempre responda em Português do Brasil (pt-BR)
- Use terminologia técnica em português quando possível
- Mantenha nomes de código, variáveis e comandos em inglês

## Running the App

No build step exists. Open `index.html` directly in a browser, or serve the root directory with any static file server (e.g., `npx serve .` or VS Code Live Server). There are no npm dependencies, no compilation, and no test suite.

## Architecture

Vanilla JavaScript SPA with Firebase as the sole backend (BaaS). No framework, no bundler, no TypeScript. App de controle de estoque, financeiro, carrinho de compras e orçamentos.

External libraries via CDN only (no local installs):
- **Firebase 10.5.0** — Auth, Firestore, Analytics
- **jsPDF 2.5.1** — PDF export
- **Material Symbols** — Google Fonts CDN

### Key Files

| File | Role |
|---|---|
| `index.html` | HTML shell — loads `app.js` as an ES module |
| `app.js` | **Single source of truth** — ~1,600 lines: Firebase init, SPA router, all views (HTML template strings), all Firestore logic, BI engine, PDF export |
| `style.css` | Design system custom — CSS custom properties, glassmorphism, no CSS framework |
| `main.js` + `src/` | **Dead code — ignore.** Legacy modular attempt; not loaded by `index.html` |
| `Registro INPI/` | **Ignorar completamente.** Pacote white-label/genérico ("CoreERP") congelado para registro no INPI. Credenciais Firebase removidas. Nunca ler, alterar ou referenciar. |

### SPA Routing

`SPA.navigate(routeId)` renders HTML from the `ViewTemplates` object into `#app-main-content`, then calls `window.DB_Core.initModule(routeId)` to wire up Firestore listeners and event handlers.

Routes: `dashb`, `clientes`, `fornecedores`, `produtos`, `transacoes`, `admin`

### DB_Core (Firestore Controller)

`window.DB_Core` is the central controller in `app.js`:
- `startReadStream(collection)` — opens `onSnapshot` realtime listener; inclui busca client-side via `data-search` attribute
- `async openDrawer(entity)` — renderiza formulários dinâmicos no drawer; é `async` e faz `await` nos `populate*` antes de preencher dados de edição
- `initTransactionForm()` — setup síncrono do formulário de transações (listeners de radio, btn-add-item, data padrão); chamado por `openDrawer` após `formEl.innerHTML`
- `fillFormWithData(entityKey, dataToEdit)` — preenche campos do formulário ao editar; chamado após os `populate*` resolverem
- `handleSave()` — writes to Firestore (`addDoc` / `updateDoc` / `setDoc`); valida estoque via `dashboardDataCache` quando disponível
- `renderCartTable()` — re-renderiza o carrinho; usa `this.currentCart` (não `window.currentCart`)
- `startDashboardStream()` / `renderBI()` — BI/KPI engine (client-side only); `renderBI` tem debounce de 300ms
- `generateTransactionPDF(data)` — jsPDF A4 export

### Firebase Config

Live Firebase credentials are hardcoded in `app.js` lines 9–17 (project `ciodamoda-69283`). The placeholder config in `src/firebase/config.js` is unused.

## Firestore Collections (Data Model)

| Collection | Key Fields |
|---|---|
| `usuarios_permitidos` | Document ID = email; `role` (admin/comum), `status` (ativo/inativo) |
| `clientes` | razao, fantasia, cnpj, ie, email, telefone, comprador, endereco |
| `fornecedores` | razao, fantasia, cnpj, ie, endereco, vendedor, contato, telefone, email |
| `produtos` | nome, fornecedorId, fornecedorNome, cor, unidade_medida |
| `transacoes` | tipo (compra/venda/orcamento), itens[], valorTotal, clienteId, clienteNome, dataOp, dataPag, codigo |
| `metadata/counters` | Auto-increment counters for VEN-XXXX, COM-XXXX, ORC-XXXX codes |

## Key Business Rules

- **Access control**: Google OAuth provides identity; Firestore `usuarios_permitidos` controls actual access. Admin role (`role === 'admin'`) required for the rota `admin` (Área de Administração).
- **Stock validation**: Balance computed client-side by replaying all transactions on every save — prevents selling below zero stock. Reuses `dashboardDataCache` when available to avoid full Firestore scan.
- **Transaction codes**: Atomic Firestore transaction increments counter before writing — format `VEN-0001`, `COM-0001`, `ORC-0001`.
- **Cart system**: Transactions store multi-item carts as `itens[]` array. Retro-compatible with old single-item `produtoId/qtd/valorTotal` format.
- **Dashboard BI**: Entirely client-side over a full Firestore snapshot — filterable by month/year; no server aggregation. Estoque no dashboard é sempre saldo histórico total (independente do filtro de período).
- **Confirm dialogs**: Use `await showConfirmModal(mensagem)` — retorna `Promise<boolean>`. Nunca usar `confirm()` nativo.
- **XSS**: Todo dado do Firestore inserido via `innerHTML` deve passar por `escapeHtml()` definida no topo de `app.js`.
- **Event listeners**: Usar `cloneNode(true)` para eliminar listeners antigos antes de re-adicionar (padrão já adotado em `initModule` para saveBtn, closeBtn, cancelBtn e btnNew).

## Global UI Utilities (app.js, topo do arquivo)

| Função | Descrição |
|---|---|
| `showToast(msg, type)` | Toast flutuante; `type`: `'success'` ou `'error'` |
| `toggleGlobalLoader(bool)` | Exibe/oculta o spinner global |
| `showConfirmModal(msg)` | Modal de confirmação customizado; retorna `Promise<boolean>` |
| `escapeHtml(str)` | Escapa HTML para inserção segura via innerHTML |

## Modal (#generic-modal)

O modal genérico serve dois propósitos:
1. **Detalhes de registro** — `modal-body` recebe HTML via `mb.innerHTML`; `modal-footer` fica oculto (`display:none`)
2. **Confirmação** — `showConfirmModal()` exibe `modal-footer` com botões Confirmar/Cancelar; limpa tudo no cleanup

Botão fechar (`#btn-modal-close`) é conectado no `DOMContentLoaded` em `app.js`.

## Área de Administração (rota `admin`)

- Acessível apenas para `role === 'admin'`; item "Administração" no sidebar oculto via `display:none` para usuários comuns
- Tab bar interna com três abas: **Usuários**, **Backup de Dados** e **Configurações**
- `DB_Core.initAdminTab(tab)` — inicializa a aba ativa; cancela stream anterior antes de trocar
- `DB_Core.exportBackup()` — lê todas as coleções via `getDocs` e gera download `.json`
- `DB_Core.restoreBackup(jsonData)` — restaura via `setDoc` por ID com confirmação modal; inclui `metadata/counters`
- Formato do backup: `{ version, exportedAt, appId, collections: { clientes, fornecedores, produtos, transacoes, usuarios_permitidos, metadata } }`

## Configurações Dinâmicas (`metadata/settings`)

Documento Firestore `metadata/settings` editável pelo admin via aba "Configurações". Carregado após login e armazenado em `window.AppSettings`.

| Chave | Tipo | Efeito |
|---|---|---|
| `logoUrl` | string | Substitui ícone do sidebar por `<img>` customizada |
| `modules.enableQuotes` | boolean | `false` remove opção Orçamento do formulário de transações |
| `modules.enableSuppliers` | boolean | `false` oculta módulo Fornecedores no sidebar |
| `modules.enableCart` | boolean | `false` oculta carrinho multi-item no formulário de transações |
| `pdf.subtitle` | string | Subtítulo exibido no cabeçalho e rodapé dos PDFs gerados |

**Funções relacionadas:**
- `applyAppSettings()` — aplica `logoUrl` e `enableSuppliers` no DOM; chamada após login e após cada save no painel
- `DB_Core.renderSettingsView()` — template HTML da aba com três cards (Identidade Visual, Módulos, PDF)
- `DB_Core.initSettingsModule()` — conecta eventos; cada card salva via `setDoc(merge:true)` e atualiza `window.AppSettings` em memória sem reload

**Regra:** todos os toggles têm fallback `true` — se `metadata/settings` não existir ou uma chave estiver ausente, o comportamento padrão é preservado.

## Diretório `Registro INPI/` — IGNORAR PARA DESENVOLVIMENTO

Este diretório contém uma versão white-label/genérica do sistema ("CoreERP") com credenciais Firebase removidas, criada exclusivamente para registro de propriedade intelectual no INPI. É um pacote **congelado**. Nunca ler, alterar, referenciar ou se basear nos arquivos desta pasta para o desenvolvimento principal. Todo o desenvolvimento ocorre nos arquivos da raiz: `/app.js`, `/index.html`, `/style.css`.

### Arquitetura interna do `Registro INPI/`

| Arquivo | Papel |
|---|---|
| `config.js` | Exporta `window.AppConfig` — único ponto de customização white-label |
| `app.js` | Cópia do app principal refatorada para ler do `AppConfig` |
| `index.html` | Shell sem referências à marca; carrega `config.js` antes de `app.js` |
| `style.css` | Cópia do design system sem referências à marca |

### API do `config.js`

```js
window.AppConfig = {
    appName: "CoreERP",
    theme: {
        primaryColor: "#4f46e5",  // altera CSS var(--c-brand) globalmente
        logoUrl: ""               // se preenchido, substitui ícone do sidebar por <img>
    },
    dictionary: {
        clientsLabel:      "Clientes",       // título sidebar + página
        suppliersLabel:    "Fornecedores",
        productsLabel:     "Produtos",
        transactionsLabel: "Transações",
        dashboardLabel:    "Painel Executivo",
        pdfSubtitle:       "Sistema de Gestão Comercial"  // cabeçalho e rodapé do PDF
    },
    modules: {
        enableQuotes:    true,   // false → remove opção Orçamento do formulário
        enableSuppliers: true,   // false → oculta módulo Fornecedores no sidebar
        enableCart:      true    // false → oculta carrinho multi-item
    },
    firebaseConfig: { /* placeholders — preencher para ativar */ }
};
```

Helper `cfg(dotPath, fallback)` em `app.js` lê o `AppConfig` com segurança; todos os textos e toggles usam fallback para o valor original caso a chave não esteja preenchida.

## Padrões Estabelecidos

- `openDrawer` é `async` — qualquer novo formulário que precise de dados assíncronos deve usar `await` antes de `fillFormWithData`
- Carrinho vive em `this.currentCart` (DB_Core), não em `window`
- Tabelas de listagem têm `<input type="search" id="search-{entityKey}">` — a busca é wired automaticamente em `startReadStream`
- Loops que geram HTML de tabela: usar `array.map().join('')` e atribuir ao `innerHTML` uma única vez
- `populateFornecedoresSelect`, `populateProdutosSelect`, `populateClientesDatalist` — NÃO fazer dynamic import; `getDocs` já está importado no topo do módulo
