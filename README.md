# Restaurante Express

Sistema web de restaurante com:
- catálogo de pratos (com imagens)
- criação de pedidos
- painel da cozinha com login de funcionários

## Como iniciar localmente

### 1) Requisitos
- Node.js 18+

### 2) Rodar
```bash
npm start
```

A aplicação abre em:
- `http://localhost:3000`

Se a porta 3000 já estiver ocupada, o servidor tenta automaticamente a próxima disponível (`3001`, `3002`, ...).

## Área dos funcionários (cozinha)

A cozinha foi separada em uma página exclusiva:
- `http://localhost:3000/public/cozinha.html`

Credenciais padrão:
- Usuário: `funcionario`
- Senha: `123456`

Você pode trocar por variáveis de ambiente:
- `EMPLOYEE_USER`
- `EMPLOYEE_PASS`
- `EMPLOYEE_TOKEN`

Exemplo:
```bash
EMPLOYEE_USER=cozinha EMPLOYEE_PASS=minhasenha EMPLOYEE_TOKEN=token123 npm start
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
- `POST /api/func/login`
- `GET /api/pratos`
- `POST /api/pratos`
- `GET /api/pedidos` (restrito a funcionário)
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/iniciar` (restrito a funcionário)
- `PATCH /api/pedidos/:id/pronto` (restrito a funcionário)
- `PATCH /api/pedidos/:id/entregue` (restrito a funcionário)
