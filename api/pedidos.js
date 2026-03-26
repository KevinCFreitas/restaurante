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
    const db = getDb();
    const clienteNome = (req.query?.cliente_nome || '').toString().trim().toLowerCase();
    const pedidos = db.pedidos.slice().reverse().map(enrichPedido);

    if (isEmployeeAuthorized(req)) {
      return sendJson(res, 200, pedidos);
    }

    if (!clienteNome) {
      return sendJson(res, 401, { erro: 'Acesso restrito para funcionários.' });
    }

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

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { cliente_nome, itens, tipo_atendimento } = body;

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
        tipo_atendimento: tipo_atendimento === 'retirada' ? 'retirada' : 'delivery',
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
