const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { ensureDb, readDb, writeDb } = require('./lib/db');

const BASE_PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = path.join(__dirname, 'database.json');
const EMPLOYEE_USER = process.env.EMPLOYEE_USER || 'funcionario';
const EMPLOYEE_PASS = process.env.EMPLOYEE_PASS || '123456';
const EMPLOYEE_TOKEN = process.env.EMPLOYEE_TOKEN || 'restaurante-func-token';

function nowIso() {
  return new Date().toISOString();
}

function isEmployeeAuthorized(req) {
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${EMPLOYEE_TOKEN}`;
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, requestedPath) {
  const safePath = requestedPath.replace(/^\/public\//, '/');
  const resolved = safePath === '/' ? '/index.html' : safePath;
  const filePath = path.join(PUBLIC_DIR, resolved);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk.toString()));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function enrichPedido(pedido) {
  let tempoTotalEstimado = 0;
  for (const item of pedido.itens) {
    tempoTotalEstimado = Math.max(tempoTotalEstimado, item.tempo_estimado_min * item.quantidade);
  }

  return {
    ...pedido,
    tempo_total_estimado_min: tempoTotalEstimado,
    tempo_em_producao_min: pedido.iniciado_em
      ? Math.floor((Date.now() - new Date(pedido.iniciado_em).getTime()) / 60000)
      : null
  };
}

ensureDb(DB_PATH);

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);


  if (req.method === 'POST' && reqUrl.pathname === '/api/func/login') {
    try {
      const body = await collectBody(req);
      if (body.usuario === EMPLOYEE_USER && body.senha === EMPLOYEE_PASS) {
        return sendJson(res, 200, { token: EMPLOYEE_TOKEN });
      }
      return sendJson(res, 401, { erro: 'Usuário ou senha inválidos' });
    } catch (error) {
      return sendJson(res, 400, { erro: error.message });
    }
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/pratos') {
    const db = readDb(DB_PATH);
    return sendJson(res, 200, db.pratos.filter((p) => p.ativo));
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/pratos') {
    if (!isEmployeeAuthorized(req)) return sendJson(res, 401, { erro: 'Acesso restrito para funcionários.' });
    try {
      const body = await collectBody(req);
      const { nome, categoria, preco, tempo_estimado_min, imagem_url } = body;
      if (!nome || !categoria || preco == null || !tempo_estimado_min) {
        return sendJson(res, 400, { erro: 'Preencha nome, categoria, preço e tempo estimado.' });
      }

      const db = readDb(DB_PATH);
      db.counters.prato += 1;
      const prato = {
        id: db.counters.prato,
        nome,
        categoria,
        preco: Number(preco),
        tempo_estimado_min: Number(tempo_estimado_min),
        imagem_url: imagem_url || null,
        ativo: true
      };
      db.pratos.push(prato);
      writeDb(DB_PATH, db);
      return sendJson(res, 201, prato);
    } catch (error) {
      return sendJson(res, 400, { erro: error.message });
    }
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/pedidos') {
    const db = readDb(DB_PATH);
    const pedidos = db.pedidos.slice().reverse().map(enrichPedido);
    if (isEmployeeAuthorized(req)) return sendJson(res, 200, pedidos);

    const clienteNome = (reqUrl.searchParams.get('cliente_nome') || '').trim().toLowerCase();
    if (!clienteNome) return sendJson(res, 401, { erro: 'Acesso restrito para funcionários.' });

    const filtrados = pedidos
      .filter((pedido) => pedido.cliente_nome.toLowerCase() === clienteNome)
      .map((pedido) => ({
        id: pedido.id,
        cliente_nome: pedido.cliente_nome,
        tipo_atendimento: pedido.tipo_atendimento || 'delivery',
        status: pedido.status,
        criado_em: pedido.criado_em
      }));
    return sendJson(res, 200, filtrados);
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/pedidos') {
    try {
      const body = await collectBody(req);
      const { cliente_nome, itens, tipo_atendimento } = body;

      if (!cliente_nome || !Array.isArray(itens) || !itens.length) {
        return sendJson(res, 400, { erro: 'Informe o cliente e ao menos um prato.' });
      }

      const db = readDb(DB_PATH);
      db.counters.pedido += 1;

      const itensNormalizados = itens.map((item) => {
        const prato = db.pratos.find((p) => p.id === Number(item.prato_id));
        if (!prato) throw new Error(`Prato ${item.prato_id} não encontrado`);
        return {
          prato_id: prato.id,
          nome: prato.nome,
          tempo_estimado_min: prato.tempo_estimado_min,
          quantidade: Number(item.quantidade)
        };
      });

      const pedido = {
        id: db.counters.pedido,
        cliente_nome,
        tipo_atendimento: tipo_atendimento === 'retirada' ? 'retirada' : 'delivery',
        status: 'recebido',
        criado_em: nowIso(),
        iniciado_em: null,
        pronto_em: null,
        entregue_em: null,
        itens: itensNormalizados
      };

      db.pedidos.push(pedido);
      writeDb(DB_PATH, db);
      return sendJson(res, 201, enrichPedido(pedido));
    } catch (error) {
      return sendJson(res, 400, { erro: error.message });
    }
  }

  const statusMatch = reqUrl.pathname.match(/^\/api\/pedidos\/(\d+)\/(iniciar|pronto|entregue)$/);
  if (req.method === 'PATCH' && statusMatch) {
    if (!isEmployeeAuthorized(req)) return sendJson(res, 401, { erro: 'Acesso restrito para funcionários.' });
    const pedidoId = Number(statusMatch[1]);
    const acao = statusMatch[2];

    const db = readDb(DB_PATH);
    const pedido = db.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return sendJson(res, 404, { erro: 'Pedido não encontrado' });

    if (acao === 'iniciar') {
      pedido.status = 'em_preparo';
      pedido.iniciado_em = nowIso();
    }

    if (acao === 'pronto') {
      pedido.status = 'pronto';
      pedido.pronto_em = nowIso();
    }

    if (acao === 'entregue') {
      pedido.status = 'entregue';
      pedido.entregue_em = nowIso();
    }

    writeDb(DB_PATH, db);
    return sendJson(res, 200, enrichPedido(pedido));
  }

  if (req.method === 'GET') {
    return sendFile(res, reqUrl.pathname);
  }

  res.writeHead(404);
  res.end('Rota não encontrada');
});

let currentPort = BASE_PORT;

function startServer(port) {
  currentPort = port;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Servidor restaurante ativo em http://localhost:${port}`);
  });
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const nextPort = currentPort + 1;
    console.warn(`Porta ${currentPort} ocupada. Tentando ${nextPort}...`);
    setTimeout(() => startServer(nextPort), 100);
    return;
  }

  console.error('Falha ao iniciar servidor:', error);
  process.exit(1);
});

startServer(BASE_PORT);
