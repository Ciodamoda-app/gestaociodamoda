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
| `app.js` | **Single source of truth** — ~1,500 lines: Firebase init, SPA router, all views (HTML template strings), all Firestore logic, BI engine, PDF export |
| `style.css` | Design system custom — CSS custom properties, glassmorphism, no CSS framework |
| `main.js` + `src/` | **Dead code — ignore.** Legacy modular attempt; not loaded by `index.html` |

### SPA Routing

`SPA.navigate(routeId)` renders HTML from the `ViewTemplates` object into `#app-main-content`, then calls `window.DB_Core.initModule(routeId)` to wire up Firestore listeners and event handlers.

Routes: `dashb`, `clientes`, `fornecedores`, `produtos`, `transacoes`, `usuarios_permitidos`

### DB_Core (Firestore Controller)

`window.DB_Core` is the central controller in `app.js`:
- `startReadStream(collection)` — opens `onSnapshot` realtime listener
- `openDrawer(entity)` — renders dynamic forms in a slide-in drawer
- `handleSave()` — writes to Firestore (`addDoc` / `updateDoc` / `setDoc`)
- `startDashboardStream()` / `renderBI()` — BI/KPI engine (client-side only)
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
- **Stock validation**: Balance computed client-side by replaying all transactions on every save — prevents selling below zero stock.
- **Transaction codes**: Atomic Firestore transaction increments counter before writing — format `VEN-0001`, `COM-0001`, `ORC-0001`.
- **Cart system**: Transactions store multi-item carts as `itens[]` array. Retro-compatible with old single-item `produtoId/qtd/valorTotal` format.
- **Dashboard BI**: Entirely client-side over a full Firestore snapshot — filterable by month/year; no server aggregation.
