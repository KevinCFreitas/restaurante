const {
  getDb,
  saveDb,
  parseBody,
  sendJson,
  enrichPedido,
  nowIso,
  isEmployeeAuthorized
} = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    if (!isEmployeeAuthorized(req)) return sendJson(res, 401, { erro: 'Acesso restrito para funcionários.' });
    const db = getDb();
    const pedidos = db.pedidos.slice().reverse().map(enrichPedido);
    return sendJson(res, 200, pedidos);
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { cliente_nome, itens } = body;

      if (!cliente_nome || !Array.isArray(itens) || !itens.length) {
        return sendJson(res, 400, { erro: 'Informe o cliente e ao menos um prato.' });
      }

      const db = getDb();
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
      saveDb(db);
      return sendJson(res, 201, enrichPedido(pedido));
    } catch (error) {
      return sendJson(res, 400, { erro: error.message });
    }
  }

  return sendJson(res, 405, { erro: 'Método não permitido' });
};
