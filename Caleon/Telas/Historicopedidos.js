const pedidosMock = [
  {
    id: '12344',
    numero: '12344',
    dataHora: '13 de Agosto de 2025 • 10:15',
    status: 'Enviado',
    produtos: [
      {
        id: 'morango-001',
        nome: 'Morango',
        imagem: 'https://cdn-icons-png.flaticon.com/512/590/590685.png',
        quantidade: 2,
      },
      {
        id: 'maca-001',
        nome: 'Maçã',
        imagem: 'https://cdn-icons-png.flaticon.com/512/415/415682.png',
        quantidade: 2,
      },
      {
        id: 'banana-001',
        nome: 'Banana',
        imagem: 'https://cdn-icons-png.flaticon.com/512/2909/2909761.png',
        quantidade: 4,
      },
    ],
    itensExcedentes: 5,
    valorTotal: 124.9,
    formaPagamento: 'Pagamento via Pix',
  },
  {
    id: '12343',
    numero: '12343',
    dataHora: '10 de Agosto de 2025 • 14:32',
    status: 'Em processamento',
    produtos: [
      {
        id: 'banana-001',
        nome: 'Banana',
        imagem: 'https://cdn-icons-png.flaticon.com/512/2909/2909761.png',
        quantidade: 3,
      },
      {
        id: 'maca-001',
        nome: 'Maçã',
        imagem: 'https://cdn-icons-png.flaticon.com/512/415/415682.png',
        quantidade: 1,
      },
    ],
    itensExcedentes: 2,
    valorTotal: 48.5,
    formaPagamento: 'Pagamento via Cartão',
  },
  {
    id: '12342',
    numero: '12342',
    dataHora: '05 de Agosto de 2025 • 09:08',
    status: 'Entregue',
    produtos: [
      {
        id: 'morango-001',
        nome: 'Morango',
        imagem: 'https://cdn-icons-png.flaticon.com/512/590/590685.png',
        quantidade: 1,
      },
      {
        id: 'banana-001',
        nome: 'Banana',
        imagem: 'https://cdn-icons-png.flaticon.com/512/2909/2909761.png',
        quantidade: 2,
      },
    ],
    itensExcedentes: 0,
    valorTotal: 32.75,
    formaPagamento: 'Pagamento via Pix',
  },
];

export async function carregarPedidos() {
  return pedidosMock.map((pedido) => ({
    ...pedido,
    produtos: pedido.produtos.map((produto) => ({ ...produto })),
  }));
}

export function buscarPedidoPorId(pedidoId) {
  return pedidosMock.find((pedido) => pedido.id === String(pedidoId)) || null;
}
