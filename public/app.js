const state = {
  pratos: [],
  carrinho: []
};

const cardapioEl = document.getElementById('cardapio');
const itensSelecionadosEl = document.getElementById('itens-selecionados');
const pedidosClienteEl = document.getElementById('pedidos-cliente');

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

function statusCliente(pedido) {
  if (pedido.tipo_atendimento === 'retirada') {
    if (pedido.status === 'pronto') return 'Pronto para retirada no estabelecimento';
    if (pedido.status === 'entregue') return 'Pedido retirado no estabelecimento';
    if (pedido.status === 'em_preparo') return 'Em preparo para retirada';
    return 'Recebemos seu pedido para retirada';
  }

  if (pedido.status === 'pronto') return 'Pedido pronto e sendo enviado';
  if (pedido.status === 'entregue') return 'Pedido enviado/entregue';
  if (pedido.status === 'em_preparo') return 'Pedido em preparo para envio';
  return 'Pedido recebido, aguardando preparo';
}

function renderCardapio() {
  cardapioEl.innerHTML = '';

  const grupos = state.pratos.reduce((acc, prato) => {
    const categoria = prato.categoria || 'Outros';
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(prato);
    return acc;
  }, {});

  Object.entries(grupos).forEach(([categoria, pratos]) => {
    const categoriaBox = document.createElement('section');
    categoriaBox.className = 'categoria-box';

    const titulo = document.createElement('h4');
    titulo.textContent = categoria;
    categoriaBox.appendChild(titulo);

    const lista = document.createElement('div');
    lista.className = 'categoria-grid';

    pratos.forEach((prato) => {
      const card = document.createElement('article');
      card.className = 'prato';
      card.innerHTML = `
        ${prato.imagem_url ? `<img src="${prato.imagem_url}" alt="${prato.nome}" loading="lazy" />` : ''}
        <h5>${prato.nome}</h5>
        <p><strong>${formatMoney(prato.preco)}</strong> · ${prato.tempo_estimado_min} min</p>
        <button data-prato="${prato.id}">Adicionar</button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        const current = state.carrinho.find((i) => i.prato_id === prato.id);
        if (current) current.quantidade += 1;
        else state.carrinho.push({ prato_id: prato.id, quantidade: 1, nome: prato.nome });
        renderCarrinho();
      });

      lista.appendChild(card);
    });

    categoriaBox.appendChild(lista);
    cardapioEl.appendChild(categoriaBox);
  });
}

function renderCarrinho() {
  itensSelecionadosEl.innerHTML = '<h5>Comanda</h5>';

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

async function loadPedidosCliente() {
  const clienteNome = document.getElementById('cliente_nome').value.trim().toLowerCase();
  pedidosClienteEl.innerHTML = '<p>Digite seu nome para acompanhar seus pedidos.</p>';

  if (!clienteNome) return;

  const pedidos = await api(`/api/pedidos?cliente_nome=${encodeURIComponent(clienteNome)}`);
  const meusPedidos = pedidos.slice(0, 5);

  if (!meusPedidos.length) {
    pedidosClienteEl.innerHTML = '<p>Nenhum pedido encontrado com esse nome.</p>';
    return;
  }

  pedidosClienteEl.innerHTML = '';
  meusPedidos.forEach((pedido) => {
    const card = document.createElement('article');
    card.className = 'pedido';
    card.innerHTML = `
      <h5>Pedido #${pedido.id} · ${pedido.tipo_atendimento === 'retirada' ? 'Retirada' : 'Delivery'}</h5>
      <p>${statusCliente(pedido)}</p>
    `;
    pedidosClienteEl.appendChild(card);
  });
}

document.getElementById('pedido-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const cliente_nome = document.getElementById('cliente_nome').value.trim();
  const tipo_atendimento = document.getElementById('tipo_atendimento').value;

  if (!state.carrinho.length) {
    alert('Adicione ao menos 1 item ao pedido.');
    return;
  }

  await api('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify({ cliente_nome, tipo_atendimento, itens: state.carrinho })
  });

  state.carrinho = [];
  renderCarrinho();
  await loadPedidosCliente();
  alert('Pedido enviado com sucesso!');
});

document.getElementById('cliente_nome').addEventListener('blur', () => {
  loadPedidosCliente().catch(() => {
    pedidosClienteEl.innerHTML = '<p>Não foi possível carregar os pedidos agora.</p>';
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
