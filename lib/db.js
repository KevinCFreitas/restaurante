const fs = require('fs');
const path = require('path');

const DEFAULT_PRATOS = [
  {
    id: 1,
    nome: 'Hambúrguer Artesanal',
    categoria: 'Lanches',
    preco: 29.9,
    tempo_estimado_min: 20,
    ativo: true,
    imagem_url:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 2,
    nome: 'Pizza Margherita',
    categoria: 'Pizzas',
    preco: 54.9,
    tempo_estimado_min: 35,
    ativo: true,
    imagem_url:
      'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 3,
    nome: 'Lasanha Bolonhesa',
    categoria: 'Massas',
    preco: 42,
    tempo_estimado_min: 30,
    ativo: true,
    imagem_url:
      'https://images.unsplash.com/photo-1619894991209-9f9694be045a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 4,
    nome: 'Salada Caesar',
    categoria: 'Saudável',
    preco: 24,
    tempo_estimado_min: 12,
    ativo: true,
    imagem_url:
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 5,
    nome: 'Suco Natural 500ml',
    categoria: 'Bebidas',
    preco: 11.5,
    tempo_estimado_min: 5,
    ativo: true,
    imagem_url:
      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=1200&q=80'
  }
];

function createInitialDb() {
  return {
    pratos: DEFAULT_PRATOS,
    pedidos: [],
    counters: { prato: DEFAULT_PRATOS.length, pedido: 0 }
  };
}

function ensureDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(createInitialDb(), null, 2));
  }
}

function readDb(dbPath) {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(dbPath, db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

module.exports = {
  createInitialDb,
  ensureDb,
  readDb,
  writeDb
};
