const { parseBody, sendJson, isEmployeeCredentialValid, EMPLOYEE_TOKEN, getDb } = require('../_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { erro: 'Método não permitido' });
  }

  try {
    const body = await parseBody(req);
    if (isEmployeeCredentialValid(body.usuario, body.senha)) {
      const db = getDb();
      const funcionario = (db.funcionarios || []).find((f) => f.usuario === body.usuario);
      return sendJson(res, 200, {
        token: EMPLOYEE_TOKEN,
        perfil: funcionario
          ? { nome: funcionario.nome, usuario: funcionario.usuario, cargo: funcionario.cargo }
          : { nome: body.usuario, usuario: body.usuario, cargo: 'funcionario' }
      });
    }

    return sendJson(res, 401, { erro: 'Usuário ou senha inválidos' });
  } catch (error) {
    return sendJson(res, 400, { erro: error.message });
  }
};
