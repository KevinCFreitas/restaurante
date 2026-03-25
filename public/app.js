const state = {
  pratos: [],
  pedidos: [],
  carrinho: []
};

const cardapioEl = document.getElementById('cardapio');
const pedidosEl = document.getElementById('pedidos');
const itensSelecionadosEl = document.getElementById('itens-selecionados');

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.erro || 'Erro na API');
  }

  return response.json();
}

function formatMoney(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status) {
  const map = {
    recebido: 'Recebido',
    em_preparo: 'Em preparo',
    pronto: 'Pronto',
    entregue: 'Entregue'
  };
  return map[status] || status;
}

function renderCardapio() {
  cardapioEl.innerHTML = '';

  state.pratos.forEach((prato) => {
    const card = document.createElement('article');
    card.className = 'prato';
    card.innerHTML = `
      ${prato.imagem_url ? `<img src="${prato.imagem_url}" alt="${prato.nome}" loading="lazy" />` : ''}
      <h4>${prato.nome}</h4>
      <p>${prato.categoria}</p>
      <p><strong>${formatMoney(prato.preco)}</strong> · ${prato.tempo_estimado_min} min</p>
      <button data-prato="${prato.id}">Adicionar</button>
    `;

    card.querySelector('button').addEventListener('click', () => {
      const current = state.carrinho.find((i) => i.prato_id === prato.id);
      if (current) current.quantidade += 1;
      else state.carrinho.push({ prato_id: prato.id, quantidade: 1, nome: prato.nome });
      renderCarrinho();
    });

    cardapioEl.appendChild(card);
  });
}

function renderCarrinho() {
  itensSelecionadosEl.innerHTML = '<h5>Itens selecionados</h5>';

  if (!state.carrinho.length) {
    itensSelecionadosEl.innerHTML += '<p>Nenhum item ainda.</p>';
    return;
  }

  state.carrinho.forEach((item) => {
    const row = document.createElement('p');
    row.textContent = `${item.nome} × ${item.quantidade}`;
    itensSelecionadosEl.appendChild(row);
  });
}

function renderPedidos() {
  pedidosEl.innerHTML = '';

  if (!state.pedidos.length) {
    pedidosEl.innerHTML = '<p>Sem pedidos no momento.</p>';
    return;
  }

  state.pedidos.forEach((pedido) => {
    const article = document.createElement('article');
    article.className = 'pedido';

    const itens = pedido.itens
      .map((i) => `<li>${i.nome} × ${i.quantidade} (${i.tempo_estimado_min} min)</li>`)
      .join('');

    const emProducao =
      pedido.tempo_em_producao_min == null
        ? '—'
        : `${pedido.tempo_em_producao_min} min em produção`;

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

async function loadPratos() {
  state.pratos = await api('/api/pratos');
  renderCardapio();
}

async function loadPedidos() {
  state.pedidos = await api('/api/pedidos');
  renderPedidos();
}

document.getElementById('pedido-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const cliente_nome = document.getElementById('cliente_nome').value.trim();

  if (!state.carrinho.length) {
    alert('Adicione ao menos 1 item ao pedido.');
    return;
  }

  await api('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify({ cliente_nome, itens: state.carrinho })
  });

  state.carrinho = [];
  event.target.reset();
  renderCarrinho();
  await loadPedidos();
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
  await loadPratos();
});

document.querySelectorAll('.aba').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.aba').forEach((b) => b.classList.remove('ativa'));
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('ativo'));

    button.classList.add('ativa');
    document.getElementById(`tab-${button.dataset.tab}`).classList.add('ativo');
  });
});

async function start() {
  await Promise.all([loadPratos(), loadPedidos()]);
  renderCarrinho();
  setInterval(loadPedidos, 15000);
}

start().catch((error) => {
  console.error(error);
  alert('Falha ao carregar o sistema. Veja o console.');
});
