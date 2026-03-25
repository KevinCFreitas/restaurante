const pedidosEl = document.getElementById('pedidos');
const loginCardEl = document.getElementById('login-card');
const cozinhaAppEl = document.getElementById('cozinha-app');
const TOKEN_KEY = 'func_token';

function statusLabel(status) {
  const map = {
    recebido: 'Recebido',
    em_preparo: 'Em preparo',
    pronto: 'Pronto',
    entregue: 'Entregue'
  };
  return map[status] || status;
}

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(path, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.erro || 'Erro na API');
  }

  return data;
}

function setLoggedIn(isLoggedIn) {
  loginCardEl.style.display = isLoggedIn ? 'none' : 'block';
  cozinhaAppEl.style.display = isLoggedIn ? 'block' : 'none';
}

function renderPedidos(pedidos) {
  pedidosEl.innerHTML = '';

  if (!pedidos.length) {
    pedidosEl.innerHTML = '<p>Sem pedidos no momento.</p>';
    return;
  }

  pedidos.forEach((pedido) => {
    const article = document.createElement('article');
    article.className = 'pedido';

    const itens = pedido.itens
      .map((i) => `<li>${i.nome} × ${i.quantidade} (${i.tempo_estimado_min} min)</li>`)
      .join('');

    const emProducao =
      pedido.tempo_em_producao_min == null ? '—' : `${pedido.tempo_em_producao_min} min em produção`;

    article.innerHTML = `
      <h4>Pedido #${pedido.id} · ${pedido.cliente_nome}</h4>
      <span class="status ${pedido.status}">${statusLabel(pedido.status)}</span>
      <p><strong>Entrada:</strong> ${new Date(pedido.criado_em).toLocaleString('pt-BR')}</p>
      <p><strong>Início:</strong> ${pedido.iniciado_em ? new Date(pedido.iniciado_em).toLocaleString('pt-BR') : '—'}</p>
      <p><strong>Saída (pronto/entregue):</strong> ${pedido.pronto_em ? new Date(pedido.pronto_em).toLocaleString('pt-BR') : '—'}</p>
      <p><strong>Tempo estimado:</strong> ${pedido.tempo_total_estimado_min} min</p>
      <p><strong>Tempo atual:</strong> ${emProducao}</p>
      <ul>${itens}</ul>
      <div class="acoes">
        <button data-acao="iniciar">Iniciar</button>
        <button data-acao="pronto" class="sec">Pronto</button>
        <button data-acao="entregue" class="sec">Entregue</button>
      </div>
    `;

    article.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const acao = btn.getAttribute('data-acao');
        await api(`/api/pedidos/${pedido.id}/${acao}`, { method: 'PATCH' });
        await loadPedidos();
      });
    });

    pedidosEl.appendChild(article);
  });
}

async function loadPedidos() {
  const pedidos = await api('/api/pedidos');
  renderPedidos(pedidos);
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const usuario = document.getElementById('func-user').value.trim();
    const senha = document.getElementById('func-pass').value;
    const result = await api('/api/func/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });

    localStorage.setItem(TOKEN_KEY, result.token);
    setLoggedIn(true);
    await loadPedidos();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  setLoggedIn(false);
});

async function start() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    setLoggedIn(false);
    return;
  }

  setLoggedIn(true);
  try {
    await loadPedidos();
    setInterval(loadPedidos, 15000);
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    setLoggedIn(false);
  }
}

start();
