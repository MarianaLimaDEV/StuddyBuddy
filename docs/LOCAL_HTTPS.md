# HTTPS local (dev) — Vite + PWA

Para testar PWA “a sério” (Service Worker, Cache API, Background Sync, Push), o ideal é rodar localmente em **HTTPS**.

Este projeto suporta isso via:

- **`npm run dev:https`** → gera certificados em `./certs/` e inicia o Vite com HTTPS.

---

## 1. Como usar

### Opção 1 (recomendada): mkcert (certificado confiável no browser)

No Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y mkcert libnss3-tools
mkcert -install
```

Depois, no projeto:

```bash
npm run dev:https
```

### Opção 2: openssl (self-signed)

Se não tiveres mkcert, o projeto faz fallback para `openssl` e gera um certificado self‑signed (o browser pode mostrar aviso de “Not secure”).

### Abrir no browser

Depois de iniciar:

```bash
npm run dev:https
```

- `https://localhost:5173`

---

## 2. O que acontece por baixo

- `scripts/ensure-https.mjs` cria:
  - `certs/localhost.pem`
  - `certs/localhost-key.pem`

Ele tenta **mkcert** primeiro (certificados confiáveis localmente) e faz fallback para **openssl** (self-signed).

- `vite.config.js` deteta esses ficheiros e ativa:
  - `server.https = { cert, key }`

`certs/` está ignorado no git (`.gitignore`), porque são certificados locais.

---

## 3. Notas importantes

- **Push API / Web Push** exige contexto seguro (HTTPS) *em produção*. Em desenvolvimento, **localhost** é geralmente tratado como seguro, mas usar HTTPS local evita diferenças e problemas de ambiente.
- Se usares **openssl**, alguns browsers mostram aviso (self-signed). **mkcert é recomendado**.

---

## 4. Troubleshooting

- Se o `npm run dev:https` falhar:
  - instala `mkcert` e tenta de novo
  - ou garante que `openssl` existe no sistema

