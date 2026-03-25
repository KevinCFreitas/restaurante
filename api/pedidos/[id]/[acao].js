const { getDb, saveDb, sendJson, enrichPedido, nowIso } = require('../../_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return sendJson(res, 405, { erro: 'Método não permitido' });
  }

  const { id, acao } = req.query;

  if (!['iniciar', 'pronto', 'entregue'].includes(acao)) {
    return sendJson(res, 400, { erro: 'Ação inválida' });
  }

  const db = getDb();
  const pedido = db.pedidos.find((p) => p.id === Number(id));

  if (!pedido) {
    return sendJson(res, 404, { erro: 'Pedido não encontrado' });
  }

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

  saveDb(db);
  return sendJson(res, 200, enrichPedido(pedido));
};
