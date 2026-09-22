export type Role = "admin" | "terceirizado";

export type StageKind =
  | "recebimento"
  | "corte"
  | "costura"
  | "faccao"
  | "acabamento"
  | "revisao"
  | "embalagem"
  | "expedicao"
  | "custom";

export type InsumoCategoria =
  | "tecido"
  | "linha"
  | "botao"
  | "ziper"
  | "etiqueta"
  | "embalagem"
  | "aviamento";

export type Unidade = "kg" | "m" | "un" | "cx" | "milheiro" | "cone" | "g";

export type TipoNegocio = "servico" | "fabricacao";

export type OpStatus =
  | "aberta"
  | "em_producao"
  | "revisao"
  | "finalizada"
  | "cancelada";

export type OrigemFinanceira = "manual" | "faccao" | "compra" | "faturamento";

export type StatusFinanceiro = "aberto" | "parcial" | "quitado" | "estornado";

export type OrcamentoStatus = "rascunho" | "aprovado" | "fechado";

export type MovimentoTipo = "entrada" | "reserva" | "baixa" | "liberacao";

export interface Empresa {
  id: string;
  nome: string;
  ativa: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  contato: string;
  ativo: boolean;
}

export interface Terceirizado {
  id: string;
  nome: string;
  especialidade: string;
  valorPorPeca: number;
  ativo: boolean;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  terceirizadoId?: string;
}

export interface Insumo {
  id: string;
  codigo: string;
  descricao: string;
  categoria: InsumoCategoria;
  unidadeCompra: Unidade;
  unidadeConsumo: Unidade;
  fatorConversao: number;
  estoqueMinimo: number;
  custoMedio: number;
  estoqueAtual: number;
  reservado: number;
  fornecedorId: string;
  refFornecedor: string;
}

export interface LoteInsumo {
  id: string;
  insumoId: string;
  loteFabricante: string;
  quantidade: number;
  quantidadeRestante: number;
  preco: number;
  unidade: Unidade;
  nf: string;
  dataEntrada: string;
  fornecedorId: string;
}

export interface AviamentoFicha {
  insumoId: string;
  consumoPorPeca: number;
}

export interface RoteiroEtapa {
  id: string;
  nome: string;
  kind: StageKind;
  minutos: number;
}

export interface Produto {
  id: string;
  referencia: string;
  nome: string;
  tipoNegocio: TipoNegocio;
  categoria: string;
  linha: string;
  cores: string[];
  tamanhos: string[];
  materiaPrimaId: string;
  consumoTecidoPorPeca: number;
  aviamentos: AviamentoFicha[];
  roteiro: RoteiroEtapa[];
  custoEstimado: number;
  precoVenda: number;
  fotoHint: string;
}

export interface Atado {
  id: string;
  codigo: string;
  quantidade: number;
  terceirizadoId?: string;
  stageId: string;
  status: "aberto" | "em_setor" | "concluido";
}

export interface LoteOp {
  loteId: string;
  quantidade: number;
}

export interface OrdemProducao {
  id: string;
  numero: string;
  dataEntrada: string;
  empresaId: string;
  clienteId: string;
  produtoId: string;
  tipoNegocio: TipoNegocio;
  cor: string;
  quantidade: number;
  precoUnitario: number;
  observacoes: string;
  terceirizadoIds: string[];
  valorServicoPorPeca: number;
  quantidadeProduzida: number;
  perdas: number;
  refugo: number;
  lotesInsumo: LoteOp[];
  parentOpId?: string;
  atados: Atado[];
  status: OpStatus;
  stageId: string;
  createdAt: string;
}

export interface BoardNode {
  id: string;
  kind: StageKind;
  label: string;
  color: string;
  x: number;
  y: number;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
}

export interface Pagamento {
  id: string;
  valor: number;
  data: string;
  estornado: boolean;
  motivoEstorno?: string;
  autorEstorno?: string;
}

export interface ContaPagar {
  id: string;
  empresaId: string;
  descricao: string;
  origem: OrigemFinanceira;
  origemId?: string;
  valor: number;
  vencimento: string;
  competencia: string;
  pagamentos: Pagamento[];
}

export interface ContaReceber {
  id: string;
  empresaId: string;
  clienteId: string;
  descricao: string;
  origem: OrigemFinanceira;
  origemId?: string;
  opId?: string;
  valor: number;
  vencimento: string;
  competencia: string;
  recebimentos: Pagamento[];
}

export interface Faturamento {
  id: string;
  opId: string;
  clienteId: string;
  empresaId: string;
  valor: number;
  data: string;
  competencia: string;
  contaReceberId: string;
}

export interface OrcamentoDre {
  id: string;
  empresaId: string;
  competencia: string;
  status: OrcamentoStatus;
  receitaBruta: number;
  despesasVariaveis: number;
  despesasFixas: number;
  resultadoFinanceiro: number;
  tributos: number;
}

export interface MovimentoEstoque {
  id: string;
  tipo: MovimentoTipo;
  insumoId: string;
  loteId?: string;
  quantidade: number;
  opId?: string;
  data: string;
  nf?: string;
  nota?: string;
}

export interface AppState {
  usuarios: Usuario[];
  usuarioId: string;
  empresas: Empresa[];
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  terceirizados: Terceirizado[];
  insumos: Insumo[];
  lotes: LoteInsumo[];
  produtos: Produto[];
  ops: OrdemProducao[];
  boardNodes: BoardNode[];
  boardEdges: BoardEdge[];
  contasPagar: ContaPagar[];
  contasReceber: ContaReceber[];
  faturamentos: Faturamento[];
  orcamentos: OrcamentoDre[];
  movimentos: MovimentoEstoque[];
}
