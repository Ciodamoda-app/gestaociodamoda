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

### SPA Routing

`SPA.navigate(routeId)` renders HTML from the `ViewTemplates` object into `#app-main-content`, then calls `window.DB_Core.initModule(routeId)` to wire up Firestore listeners and event handlers.

Routes: `dashb`, `clientes`, `fornecedores`, `produtos`, `transacoes`, `usuarios_permitidos`

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

- **Access control**: Google OAuth provides identity; Firestore `usuarios_permitidos` controls actual access. Admin role (`role === 'admin'`) required for the Usuários module.
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

## Padrões Estabelecidos Nesta Sessão

- `openDrawer` é `async` — qualquer novo formulário que precise de dados assíncronos deve usar `await` antes de `fillFormWithData`
- Carrinho vive em `this.currentCart` (DB_Core), não em `window`
- Tabelas de listagem têm `<input type="search" id="search-{entityKey}">` — a busca é wired automaticamente em `startReadStream`
- Loops que geram HTML de tabela: usar `array.map().join('')` e atribuir ao `innerHTML` uma única vez
- `populateFornecedoresSelect`, `populateProdutosSelect`, `populateClientesDatalist` — NÃO fazer dynamic import; `getDocs` já está importado no topo do módulo
