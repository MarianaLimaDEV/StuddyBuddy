# 📚 StuddyBuddy

O **StuddyBuddy** é uma aplicação web focada em produtividade e bem‑estar para estudar com mais consistência.  
O **Muffin** é o “companheiro virtual” que traz vida à experiência com feedback visual (foco, pausas, descanso, etc.).

## ✨ Funcionalidades

- **Pomodoro** (ciclos de foco/pausa)
- **Timer** e **cronómetro**
- **Task list**
- **Countdown** (prazos)
- **World clock** (fusos horários)
- **PWA**: offline, cache inteligente, IndexedDB, fila offline + sync, base para push notifications

## 🧱 Stack

- **Frontend**: HTML + SCSS + JavaScript (Vanilla)
- **Build/dev**: Vite
- **Backend**: Node.js + Express
- **DB**: MongoDB (Mongoose)
- **Auth**: JWT
- **PWA**: Service Worker + Cache API + IndexedDB (`idb`) + Background Sync + Push (Web Push)

## ✅ Requisitos

- **Node.js >= 18**
- **MongoDB** (local ou Atlas)
- (Opcional) **mkcert** para HTTPS local mais “limpo” (há fallback para `openssl`)

## 🚀 Como correr (dev)

1) Instalar dependências:

```bash
npm install
```

2) Criar `.env` na raiz do projeto (não commitar):

```bash
MONGO_URI=mongodb://...
PORT=3002
JWT_SECRET=troca-por-um-valor-forte

# Opcional (push)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Opcional (forgot password)
RESET_PASSWORD_TTL_MINUTES=30

# Opcional (se tiveres chatbot/IA no projeto)
OPENAI_API_KEY=...
```

3) Iniciar frontend + backend juntos:

```bash
npm start
```

- **Frontend (Vite HTTPS)**: `https://localhost:5173`
- **API (Express)**: `http://localhost:3002` (health check: `GET /api/health`)

Scripts úteis:

```bash
npm run server     # só API
npm run dev:https  # só Vite em HTTPS (gera ./certs/)
npm run build
npm run preview
```

## 📦 PWA / Offline / Sync

Documentação:
- `docs/PWA.md`
- `docs/PWA_ARCHITECTURE.md`
- `docs/LOCAL_HTTPS.md`

Notas de desenvolvimento:
- Em **DEV**, o projeto **desativa o Service Worker** para não atrapalhar o HMR do Vite (SCSS/JS).
- Para testar PWA “a sério”, usa `npm run build` + `npm run preview` (ou ambiente de produção).

## 🔐 Autenticação e “Forgot password” (dev)

- **Pedir reset**: no popup de login → **“Forgot password?”** → email → **“Enviar token”**.
- **Repor password**: token + nova password → **“Atualizar password”**.

Notas:
- O endpoint **não revela** se o email existe (resposta genérica por segurança).
- Em **modo não-production**, o backend devolve `dev.token` para facilitar testes locais.

## 🔔 Push notifications (Web Push)

1) Gerar chaves VAPID:

```bash
node scripts/generate-vapid-keys.js
```

2) Copiar `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` para o `.env`.

3) Na app, ativa push nas configurações (botão “Notificações push”).

## ✉️ Contacto

| Plataforma | Contacto |
| :-- | :-- |
| **Discord** | `@marianalima.dev` |
| **E-mail** | `marianalima.developer@gmail.com` |

## ✍️ Autora

Desenvolvido por **Mariana Lima**.

> Para acompanhar ideias e melhorias: `TODO.md`.
