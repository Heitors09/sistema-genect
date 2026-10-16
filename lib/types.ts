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
  | "aviamento"
  | (string & {});

export type Unidade = "kg" | "m" | "un" | "cx" | "milheiro" | "cone" | "g";

export type TipoNegocio = "servico" | "fabricacao";

export type OpStatus =
  | "aberta"
  | "em_producao"
  | "revisao"
  | "finalizada"
  | "cancelada";

export type OrigemFinanceira = "manual" | "faccao" | "compra" | "faturamento" | "folha";

export type StatusFinanceiro = "aberto" | "parcial" | "quitado" | "estornado";

export type OrcamentoStatus = "rascunho" | "aprovado" | "fechado";

export type TipoGrupoDre = "receita" | "deducao" | "custo" | "despesa" | "resultado";

export type NaturezaConta = "receita" | "custo" | "despesa";

/** Regime de cálculo do DRE (Sensio). */
export type DreRegime = "competencia" | "caixa" | "faturamento";

export type TipoCategoriaFinanceira = "receita" | "despesa_custo";

export type MovimentoTipo = "entrada" | "reserva" | "baixa" | "liberacao";

export type MicroStatus = "aguardando" | "em_andamento" | "pausada" | "concluida" | "pendencia";

export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
  razaoSocial?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  ativa: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  razaoSocial?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  ativo: boolean;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  contato: string;
  cnpj?: string;
  ativo: boolean;
}

export interface ServicoTerceirizado {
  id: string;
  nome: string;
  valorPorPeca: number;
}

export interface Terceirizado {
  id: string;
  nome: string;
  servicos: ServicoTerceirizado[];
  ativo: boolean;
  especialidade?: string;
  valorPorPeca?: number;
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
  categoria: string;
  unidadeCompra: Unidade;
  unidadeConsumo: Unidade;
  fatorConversao: number;
  estoqueMinimo: number;
  estoqueAtual: number;
  reservado: number;
  fornecedorId: string;
  refFornecedor: string;
  cor?: string;
}

export interface LoteInsumo {
  id: string;
  insumoId: string;
  loteFabricante?: string;
  quantidade: number;
  quantidadeRestante: number;
  preco: number;
  unidade: Unidade;
  nf: string;
  anexoNf?: string;
  dataEntrada: string;
  fornecedorId: string;
}

export interface AviamentoFicha {
  insumoId: string;
  consumoPorPeca: number;
}

export interface GradeVariacao {
  tamanho: string;
  cores: string[];
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
  variacoes: GradeVariacao[];
  materiaPrimaId: string;
  consumoTecidoPorPeca: number;
  aviamentos: AviamentoFicha[];
  precoVenda: number;
  descricao?: string;
  imagens: string[];
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

export interface OpVariacao {
  tamanho: string;
  cor: string;
  quantidade: number;
}

export interface OpProdutoLinha {
  id: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  tamanho?: string;
  variacoes: OpVariacao[];
}

export type RoteiroArestaKind = "sequencia" | "bifurcacao" | "filha" | "reuniao";

/** Ligação no fluxograma do roteiro / micro-caminho. */
export interface RoteiroAresta {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  kind?: RoteiroArestaKind;
}

export interface MicroEtapa {
  id: string;
  nome: string;
  macroId: string;
  terceirizadoId?: string;
  servicoId?: string;
  altGroup?: string;
  quantidade: number;
  status: MicroStatus;
  iniciadaEm?: string;
  concluidaEm?: string;
  pendencia?: string;
  x?: number;
  y?: number;
  /** Id da micro na OP mãe (quando esta etapa veio de um split). */
  origemMicroId?: string;
}

export interface RoteiroEtapaDef {
  id: string;
  nome: string;
  macroId: string;
  terceirizado?: boolean;
  terceirizadoId?: string;
  servicoId?: string;
  altGroup?: string;
  x?: number;
  y?: number;
}

export interface RoteiroModelo {
  id: string;
  nome: string;
  etapas: RoteiroEtapaDef[];
  /** Grafo do fluxograma. Se ausente, deriva da ordem linear (+ altGroup). */
  arestas?: RoteiroAresta[];
  inicioId?: string;
}

export interface AnexoOp {
  id: string;
  nome: string;
  tipo: "jpg" | "pdf" | "image";
  dataUrl: string;
}

export interface PendenciaOp {
  id: string;
  texto: string;
  autor: string;
  createdAt: string;
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
  urgente: boolean;
  prioridade: boolean;
  fotosFicha: string[];
  anexos: AnexoOp[];
  linhas: OpProdutoLinha[];
  roteiroId?: string;
  roteiroNome?: string;
  micros: MicroEtapa[];
  /** Fluxograma dos micro-caminhos desta OP. */
  microArestas?: RoteiroAresta[];
  /** Nó atual no fluxograma (desta OP). */
  microAtualId?: string;
  pendencias: PendenciaOp[];
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

export interface GrupoDre {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoGrupoDre;
  ordem: number;
  /** +1 soma no resultado; -1 subtrai (dedução/custo/despesa). */
  sinal: 1 | -1;
  ativo: boolean;
  /** Grupo estrutural do DRE (não remover na UI). */
  fixo?: boolean;
}

export interface PlanoConta {
  id: string;
  codigo: string;
  nome: string;
  grupoDreId: string;
  natureza: NaturezaConta;
  ativa: boolean;
  aceitaLancamento: boolean;
  contaPaiId?: string;
}

/**
 * Categoria financeira (Sensio): usada no lançamento.
 * Sem grupo DRE, a categoria não entra no DRE.
 */
export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoCategoriaFinanceira;
  grupoDreId?: string;
  contaPlanoId?: string;
  parentId?: string;
  ativa: boolean;
  padraoVendas?: boolean;
  padraoReceber?: boolean;
  padraoCompras?: boolean;
  padraoPagar?: boolean;
}

export interface ContaPagar {
  id: string;
  empresaId: string;
  descricao: string;
  origem: OrigemFinanceira;
  origemId?: string;
  /** Categoria financeira (Sensio) — define grupo DRE. */
  categoriaId?: string;
  /** Conta do plano (espelho da categoria). */
  contaPlanoId?: string;
  /** Despesa programada / recorrente. */
  programada?: boolean;
  /** Dia do mês para renovação (1–28). */
  recorrenciaDia?: number;
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
  categoriaId?: string;
  contaPlanoId?: string;
  valor: number;
  vencimento: string;
  competencia: string;
  recebimentos: Pagamento[];
}

/** Lançamento de folha (pago / em aberto), espelhado em ContaPagar quando gerado. */
export interface FolhaPagamento {
  id: string;
  empresaId: string;
  competencia: string;
  colaborador: string;
  cargo?: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  pagoEm?: string;
  contaPagarId?: string;
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

export interface Notificacao {
  id: string;
  tipo: "micro_recebido" | "op_atrasada" | "estoque_insuficiente";
  titulo: string;
  texto: string;
  opId?: string;
  lida: boolean;
  createdAt: string;
}

export interface ReciboTerceirizado {
  id: string;
  terceirizadoId: string;
  competencia: string;
  nome: string;
  dataUrl: string;
}

/** Forma de pagamento do serviço/atividade do terceirizado. */
export type AcertoModo = "inteiro" | "partes" | "desconto";

/** Andamento do pagamento ao terceirizado. */
export type AcertoStatus = "pendente" | "pagando" | "pago";

export type AcertoLancamentoTipo = "pagamento" | "desconto";

/** Lançamento no acerto: pagamento (verde) ou desconto (vermelho). */
export interface AcertoLancamento {
  id: string;
  tipo: AcertoLancamentoTipo;
  valor: number;
  data: string;
  nota?: string;
}

/** Acerto de pagamento por OP + micro (serviço/atividade). */
export interface AcertoTerceirizado {
  id: string;
  terceirizadoId: string;
  opId: string;
  microId: string;
  modo: AcertoModo;
  status: AcertoStatus;
  valorOriginal: number;
  desconto: number;
  /** Já pago (útil em pagamento por partes). */
  pago: number;
  /** Histórico estilo trade: pagamentos em verde, descontos em vermelho. */
  lancamentos: AcertoLancamento[];
  observacao?: string;
  updatedAt: string;
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
  gruposDre: GrupoDre[];
  planoContas: PlanoConta[];
  categoriasFinanceiras: CategoriaFinanceira[];
  folhasPagamento: FolhaPagamento[];
  movimentos: MovimentoEstoque[];
  roteiros: RoteiroModelo[];
  notificacoes: Notificacao[];
  recibos: ReciboTerceirizado[];
  acertosTerceirizado: AcertoTerceirizado[];
  categoriasInsumo: string[];
  tamanhosPadrao: string[];
  coresPadrao: string[];
}
