const path = require('path');
const { ensureDb, readDb, writeDb } = require('../lib/db');

const DB_PATH = path.join('/tmp', 'restaurante-database.json');
const EMPLOYEE_USER = process.env.EMPLOYEE_USER || 'funcionario';
const EMPLOYEE_PASS = process.env.EMPLOYEE_PASS || '123456';
const EMPLOYEE_TOKEN = process.env.EMPLOYEE_TOKEN || 'restaurante-func-token';

function nowIso() {
  return new Date().toISOString();
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

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

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

function isEmployeeAuthorized(req) {
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${EMPLOYEE_TOKEN}`;
}

function isEmployeeCredentialValid(usuario, senha) {
  const db = getDb();
  const funcionario = (db.funcionarios || []).find((f) => f.usuario === usuario && f.senha === senha);
  if (funcionario) return true;
  return usuario === EMPLOYEE_USER && senha === EMPLOYEE_PASS;
}

function getDb() {
  ensureDb(DB_PATH);
  const db = readDb(DB_PATH);

  if (!Array.isArray(db.funcionarios)) {
    db.funcionarios = [
      {
        id: 1,
        nome: 'Funcionário Padrão',
        usuario: EMPLOYEE_USER,
        senha: EMPLOYEE_PASS,
        cargo: 'funcionario'
      }
    ];
  }

  if (!db.counters) {
    db.counters = { prato: 0, pedido: 0, funcionario: db.funcionarios.length };
  }

  if (!db.counters.funcionario) {
    db.counters.funcionario = db.funcionarios.length || 1;
  }

  return db;
}

function saveDb(db) {
  writeDb(DB_PATH, db);
}

module.exports = {
  nowIso,
  enrichPedido,
  sendJson,
  parseBody,
  getDb,
  saveDb,
  isEmployeeAuthorized,
  isEmployeeCredentialValid,
  EMPLOYEE_TOKEN
};
