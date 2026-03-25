# Restaurante Express

Sistema web de restaurante com:
- catálogo de pratos (com imagens)
- criação de pedidos
- painel da cozinha com tempos de entrada/início/saída

## Como iniciar localmente

### 1) Requisitos
- Node.js 18+

### 2) Rodar
```bash
npm start
```

> Este projeto **não depende de `npm install`** para iniciar, porque não usa pacotes externos.

A aplicação abre em:
- `http://localhost:3000`

Se a porta 3000 já estiver ocupada, o servidor tenta automaticamente a próxima disponível (`3001`, `3002`, ...).

### 3) Porta personalizada
```bash
PORT=4000 npm start
```

## Deploy na Vercel

Este repositório já está preparado para Vercel com:
- `vercel.json` (roteamento para SPA + funções em `/api`)
- APIs serverless em `api/`

Passo a passo:
1. Suba o repositório no GitHub.
2. Na Vercel, clique em **Add New → Project**.
3. Importe o repositório.
4. Framework preset: **Other**.
5. Deploy.

### Importante sobre dados na Vercel
Na Vercel, a base JSON roda em `/tmp` (temporária). Isso é ótimo para demo, mas não é persistência definitiva.
Para produção real, conecte um banco (Postgres, MongoDB, Supabase, etc.).

## Rotas da API
- `GET /api/pratos`
- `POST /api/pratos`
- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/iniciar`
- `PATCH /api/pedidos/:id/pronto`
- `PATCH /api/pedidos/:id/entregue`
