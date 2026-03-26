const { getDb, saveDb, parseBody, sendJson, isEmployeeAuthorized } = require('./_utils');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const db = getDb();
    return sendJson(res, 200, db.pratos.filter((p) => p.ativo));
  }

  if (req.method === 'POST') {
    if (!isEmployeeAuthorized(req)) {
      return sendJson(res, 401, { erro: 'Acesso restrito para funcionários.' });
    }

    try {
      const body = await parseBody(req);
      const { nome, categoria, preco, tempo_estimado_min, imagem_url } = body;

      if (!nome || !categoria || preco == null || !tempo_estimado_min) {
        return sendJson(res, 400, { erro: 'Preencha nome, categoria, preço e tempo estimado.' });
      }

      const db = getDb();
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
      saveDb(db);
      return sendJson(res, 201, prato);
    } catch (error) {
      return sendJson(res, 400, { erro: error.message });
    }
  }

  return sendJson(res, 405, { erro: 'Método não permitido' });
};
