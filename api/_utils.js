const path = require('path');
const { ensureDb, readDb, writeDb } = require('../lib/db');

const DB_PATH = path.join('/tmp', 'restaurante-database.json');

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

function getDb() {
  ensureDb(DB_PATH);
  return readDb(DB_PATH);
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
  saveDb
};
