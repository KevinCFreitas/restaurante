const { parseBody, sendJson, isEmployeeCredentialValid, EMPLOYEE_TOKEN } = require('../_utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { erro: 'Método não permitido' });
  }

  try {
    const body = await parseBody(req);
    if (isEmployeeCredentialValid(body.usuario, body.senha)) {
      return sendJson(res, 200, { token: EMPLOYEE_TOKEN });
    }

    return sendJson(res, 401, { erro: 'Usuário ou senha inválidos' });
  } catch (error) {
    return sendJson(res, 400, { erro: error.message });
  }
};
