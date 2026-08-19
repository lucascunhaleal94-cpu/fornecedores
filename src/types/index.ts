export type ClientStatus = 'ativo' | 'inativo' | 'bloqueado' | 'prospecto';
export type LeadStatus = 'novo' | 'em_contato' | 'qualificado' | 'proposta' | 'em_analise' | 'convertido' | 'perdido';
export type UserRole = 'administrador' | 'comercial' | 'tecnico';

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  estado: string;
  cidade: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  telefone?: string;
  email?: string;
  createdAt: string;
}

export interface NotaFiscal {
  id: string;
  fornecedor_id: string;
  numero_nota: string;
  data_emissao: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  motivo?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  contatoPrincipal: string;
  cargo: string;
  observacoes: string;
  status: ClientStatus;
  markup?: number;
  ultimaCompra?: string;
  createdAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  texto: string;
  autor: string;
  createdAt: string;
  updatedAt: string;
}

export interface PDT {
  id: string;
  clientId?: string;
  numero: string;
  data: string;
  vencimento?: string;
  produto: string;
  descricao: string;
  status: 'PENDENTE' | 'INICIADO' | 'EM ANDAMENTO' | 'FINALIZADO (LA)' | 'CONCLUÍDO' | 'STAND BY';
  responsavel: string;
  observacoes: string;
  resultado?: string;
  followUp?: string;
  retornoCliente?: string;
  unmatchedClientName?: string;
  unmatchedProductCode?: string;
}

export interface RT {
  id: string;
  clientId?: string;
  numero: string;
  data: string;
  vencimento?: string;
  produto: string;
  descricao: string;
  status: 'PENDENTE' | 'INICIADO' | 'EM ANDAMENTO' | 'FINALIZADO (LA)' | 'CONCLUÍDO' | 'STAND BY' | 'pendente' | 'em_andamento' | 'finalizada_la' | 'concluida';
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  responsavel: string;
  observacoes: string;
  op?: string;
  conclusao?: string;
  followUp?: string;
  retornoCliente?: string;
  unmatchedClientName?: string;
  unmatchedProductCode?: string;
}

export interface DANFE {
  id: string;
  clientId: string;
  numero: string;
  data: string;
  valor: number;
  chave: string;
  arquivoPdf?: string;
  arquivoXml?: string;
  pesoLiquido?: number;
  items?: DANFEItem[];
}

export interface DANFEItem {
  id: string;
  danfeId: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
}

export interface Romaneio {
  id: string;
  clientId: string;
  numero: string;
  data: string;
  valor: number;
  pesoLiquido?: number;
  items?: RomaneioItem[];
}

export interface RomaneioItem {
  id: string;
  romaneioId: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
}

export interface PriceItem {
  id: string;
  clientId: string;
  codigo: string;
  descricao: string;
  precoKg: number;
  ultimoPedido?: string;
  ultimoReajuste?: string;
  origem?: 'DANFE' | 'Romaneio' | 'Editada' | 'Manual';
  historico?: PriceHistory[];
  ignoreChurnAlert?: boolean;
}

export interface PriceHistory {
  id: string;
  priceItemId: string;
  precoAnterior: number;
  precoNovo: number;
  data: string;
  danfeNumero?: string;
}

export interface Lead {
  id: string;
  empresa: string;
  cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  origem: string;
  segmento: string;
  interesse: string;
  status: LeadStatus;
  responsavel: string;
  observacoes: string;
  attachments?: ProjectAttachment[];
  createdAt: string;
}

export interface Product {
  id: string;
  codigo: string;
  descricao: string;
  custoKg: number;
  createdAt: string;
  updatedAt: string;
}

export type ContratacaoType = 'CLT' | 'PJ' | 'Estágio';

export interface Collaborator {
  id: string;
  codigo: string;
  nome: string;
  departamento?: string;
  obs?: string;
  dataNascimento?: string;
  createdAt: string;
  updatedAt: string;
}

export type UrgenciaType = 'baixa' | 'media' | 'alta';

export interface PendencyInteraction {
  id: string;
  autor: string; // Ex: "Administrador (Lucas)" ou "Usuário (Geovane)"
  autorEmail?: string;
  texto: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Pendency {
  id: string;
  fornecedorId?: string;
  colaboradoresIds: string[];
  descricao: string;
  prazo: string;
  urgencia: UrgenciaType;
  concluida: boolean;
  dataConclusao?: string;
  obsConclusao?: string;
  observacao?: string;
  anexos?: ProjectAttachment[];
  interacoes?: PendencyInteraction[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'PENDENTE' | 'EM ANDAMENTO' | 'FINALIZADO';

export type ProjectDepartment = 'MARKETING' | 'TÉCNICO' | 'COMERCIAL' | 'FINANCEIRO' | 'CONTÁBIL' | 'JURÍDICO' | 'COMPRAS' | 'ALMOXARIFADO' | 'MANUTENÇÃO';

export interface ProjectAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'excel' | 'other' | 'link';
  url: string; // Base64 if uploaded locally, or String if external link
}

export interface Project {
  id: string;
  responsavel: string;
  departamento?: ProjectDepartment;
  descricao: string;
  urgencia: UrgenciaType;
  prazo: string;
  obs?: string;
  status: ProjectStatus;
  attachments: ProjectAttachment[];
  createdAt: string;
  updatedAt: string;
}
