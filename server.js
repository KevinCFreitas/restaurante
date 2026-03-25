const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = path.join(__dirname, 'database.json');

function nowIso() {
  return new Date().toISOString();
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      pratos: [
        { id: 1, nome: 'Hambúrguer Artesanal', categoria: 'Lanches', preco: 29.9, tempo_estimado_min: 20, ativo: true },
        { id: 2, nome: 'Pizza Margherita', categoria: 'Pizzas', preco: 54.9, tempo_estimado_min: 35, ativo: true },
        { id: 3, nome: 'Lasanha Bolonhesa', categoria: 'Massas', preco: 42.0, tempo_estimado_min: 30, ativo: true },
        { id: 4, nome: 'Salada Caesar', categoria: 'Saudável', preco: 24.0, tempo_estimado_min: 12, ativo: true },
        { id: 5, nome: 'Suco Natural 500ml', categoria: 'Bebidas', preco: 11.5, tempo_estimado_min: 5, ativo: true }
      ],
      pedidos: [],
      counters: { prato: 5, pedido: 0 }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  }
}

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8'
  };

  res.writeHead(200, { 'Content-Type': map[ext] || 'text/plain; charset=utf-8' });
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

ensureDb();

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && reqUrl.pathname === '/api/pratos') {
    const db = readDb();
    return sendJson(res, 200, db.pratos.filter((p) => p.ativo));
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/pratos') {
    try {
      const body = await collectBody(req);
      const { nome, categoria, preco, tempo_estimado_min } = body;
      if (!nome || !categoria || preco == null || !tempo_estimado_min) {
        return sendJson(res, 400, { erro: 'Preencha nome, categoria, preço e tempo estimado.' });
      }

      const db = readDb();
      db.counters.prato += 1;
      const prato = {
        id: db.counters.prato,
        nome,
        categoria,
        preco: Number(preco),
        tempo_estimado_min: Number(tempo_estimado_min),
        ativo: true
      };
      db.pratos.push(prato);
      writeDb(db);
      return sendJson(res, 201, prato);
    } catch (error) {
      return sendJson(res, 400, { erro: error.message });
    }
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/pedidos') {
    const db = readDb();
    const pedidos = db.pedidos.slice().reverse().map(enrichPedido);
    return sendJson(res, 200, pedidos);
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/pedidos') {
    try {
      const body = await collectBody(req);
      const { cliente_nome, itens } = body;

      if (!cliente_nome || !Array.isArray(itens) || !itens.length) {
        return sendJson(res, 400, { erro: 'Informe o cliente e ao menos um prato.' });
      }

      const db = readDb();
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
        status: 'recebido',
        criado_em: nowIso(),
        iniciado_em: null,
        pronto_em: null,
        entregue_em: null,
        itens: itensNormalizados
      };

      db.pedidos.push(pedido);
      writeDb(db);
      return sendJson(res, 201, enrichPedido(pedido));
    } catch (error) {
      return sendJson(res, 400, { erro: error.message });
    }
  }

  const statusMatch = reqUrl.pathname.match(/^\/api\/pedidos\/(\d+)\/(iniciar|pronto|entregue)$/);
  if (req.method === 'PATCH' && statusMatch) {
    const pedidoId = Number(statusMatch[1]);
    const acao = statusMatch[2];

    const db = readDb();
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

    writeDb(db);
    return sendJson(res, 200, enrichPedido(pedido));
  }

  if (req.method === 'GET') {
    const filePath =
      reqUrl.pathname === '/'
        ? path.join(PUBLIC_DIR, 'index.html')
        : path.join(PUBLIC_DIR, reqUrl.pathname);
    return sendFile(res, filePath);
  }

  res.writeHead(404);
  res.end('Rota não encontrada');
});

server.listen(PORT, () => {
  console.log(`Servidor restaurante ativo em http://localhost:${PORT}`);
});
