# Restaurante Express

Sistema web de restaurante com:
- catálogo de pratos
- criação de pedidos
- painel da cozinha com tempos de entrada/início/saída

## Como iniciar

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

### 3) Portas personalizadas
Você pode definir uma porta inicial:
```bash
PORT=4000 npm start
```

## Rotas da API
- `GET /api/pratos`
- `POST /api/pratos`
- `GET /api/pedidos`
- `POST /api/pedidos`
- `PATCH /api/pedidos/:id/iniciar`
- `PATCH /api/pedidos/:id/pronto`
- `PATCH /api/pedidos/:id/entregue`
