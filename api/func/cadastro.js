const { getDb, saveDb, parseBody, sendJson } = require('../_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { erro: 'Método não permitido' });
  }

  try {
    const body = await parseBody(req);
    const { nome, usuario, senha, cargo } = body;

    if (!nome || !usuario || !senha || !cargo) {
      return sendJson(res, 400, { erro: 'Informe nome, usuário, senha e cargo.' });
    }

    if (!['funcionario', 'cozinheiro'].includes(cargo)) {
      return sendJson(res, 400, { erro: 'Cargo inválido. Use funcionario ou cozinheiro.' });
    }

    const db = getDb();
    if ((db.funcionarios || []).some((f) => f.usuario === usuario)) {
      return sendJson(res, 409, { erro: 'Usuário já cadastrado.' });
    }

    db.counters.funcionario += 1;
    const novo = {
      id: db.counters.funcionario,
      nome: nome.trim(),
      usuario: usuario.trim(),
      senha,
      cargo
    };

    db.funcionarios.push(novo);
    saveDb(db);

    return sendJson(res, 201, { id: novo.id, nome: novo.nome, usuario: novo.usuario, cargo: novo.cargo });
  } catch (error) {
    return sendJson(res, 400, { erro: error.message });
  }
};
