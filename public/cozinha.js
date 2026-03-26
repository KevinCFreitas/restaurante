const pedidosPendentesEl = document.getElementById('pedidos-pendentes');
const pedidosConcluidosEl = document.getElementById('pedidos-concluidos');
const loginCardEl = document.getElementById('login-card');
const cozinhaAppEl = document.getElementById('cozinha-app');
const TOKEN_KEY = 'func_token';

function statusLabel(status) {
  const map = {
    recebido: 'Recebido',
    em_preparo: 'Em preparo',
    pronto: 'Pronto',
    entregue: 'Finalizado'
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

function renderListaPedidos(listaEl, pedidos, tipo) {
  listaEl.innerHTML = '';

  if (!pedidos.length) {
    listaEl.innerHTML = `<p>Sem pedidos ${tipo === 'pendente' ? 'para fazer' : 'concluídos'}.</p>`;
    return;
  }

  pedidos.forEach((pedido) => {
    const article = document.createElement('article');
    article.className = 'pedido';

    const itens = pedido.itens.map((i) => `<li>${i.nome} × ${i.quantidade}</li>`).join('');
    const atendimento = pedido.tipo_atendimento === 'retirada' ? 'Retirada' : 'Delivery';

    article.innerHTML = `
      <h4>Pedido #${pedido.id} · ${pedido.cliente_nome}</h4>
      <span class="status ${pedido.status}">${statusLabel(pedido.status)}</span>
      <p><strong>Atendimento:</strong> ${atendimento}</p>
      <p><strong>Entrada:</strong> ${new Date(pedido.criado_em).toLocaleString('pt-BR')}</p>
      <ul>${itens}</ul>
      <div class="acoes"></div>
    `;

    const acoesEl = article.querySelector('.acoes');

    if (tipo === 'pendente') {
      const iniciarBtn = document.createElement('button');
      iniciarBtn.textContent = 'Iniciar preparo';
      iniciarBtn.addEventListener('click', async () => {
        await api(`/api/pedidos/${pedido.id}/iniciar`, { method: 'PATCH' });
        await loadPedidos();
      });
      acoesEl.appendChild(iniciarBtn);

      const prontoBtn = document.createElement('button');
      prontoBtn.textContent = 'Marcar pronto';
      prontoBtn.className = 'sec';
      prontoBtn.addEventListener('click', async () => {
        await api(`/api/pedidos/${pedido.id}/pronto`, { method: 'PATCH' });
        await loadPedidos();
      });
      acoesEl.appendChild(prontoBtn);

      if (pedido.status === 'pronto') {
        const finalizarBtn = document.createElement('button');
        finalizarBtn.className = 'sec';
        finalizarBtn.textContent = pedido.tipo_atendimento === 'retirada' ? 'Confirmar retirada' : 'Confirmar envio';
        finalizarBtn.addEventListener('click', async () => {
          await api(`/api/pedidos/${pedido.id}/entregue`, { method: 'PATCH' });
          await loadPedidos();
        });
        acoesEl.appendChild(finalizarBtn);
      }
    }

    listaEl.appendChild(article);
  });
}

function renderPedidos(pedidos) {
  const pendentes = pedidos.filter((p) => ['recebido', 'em_preparo', 'pronto'].includes(p.status));
  const concluidos = pedidos.filter((p) => p.status === 'entregue');

  renderListaPedidos(pedidosPendentesEl, pendentes, 'pendente');
  renderListaPedidos(pedidosConcluidosEl, concluidos, 'concluido');
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
      body: JSON.stringify({ usuario, senha })
    });

    localStorage.setItem(TOKEN_KEY, result.token);
    setLoggedIn(true);
    alert(`Bem-vindo(a), ${result.perfil?.nome || usuario}! Cargo: ${result.perfil?.cargo || 'funcionário'}.`);
    await loadPedidos();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('cadastro-func-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  await api('/api/func/cadastro', {
    method: 'POST',
    body: JSON.stringify({
      nome: document.getElementById('novo-nome').value.trim(),
      usuario: document.getElementById('novo-user').value.trim(),
      senha: document.getElementById('novo-pass').value,
      cargo: document.getElementById('novo-cargo').value
    })
  });

  event.target.reset();
  alert('Conta criada com sucesso! Agora faça login.');
});

document.getElementById('prato-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  await api('/api/pratos', {
    method: 'POST',
    body: JSON.stringify({
      nome: document.getElementById('prato_nome').value.trim(),
      categoria: document.getElementById('prato_categoria').value.trim(),
      preco: Number(document.getElementById('prato_preco').value),
      tempo_estimado_min: Number(document.getElementById('prato_tempo').value),
      imagem_url: document.getElementById('prato_imagem').value.trim() || null
    })
  });

  event.target.reset();
  alert('Prato cadastrado com sucesso!');
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
