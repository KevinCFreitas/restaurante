const state = {
  pratos: [],
  carrinho: []
};

const cardapioEl = document.getElementById('cardapio');
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

async function loadPratos() {
  state.pratos = await api('/api/pratos');
  renderCardapio();
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
  alert('Pedido enviado com sucesso!');
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
  await loadPratos();
  renderCarrinho();
}

start().catch((error) => {
  console.error(error);
  alert('Falha ao carregar o sistema. Veja o console.');
});
