import { GrupoDre } from './plano-contas.model';

export interface DreLancamentoDetalhe {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  fornecedor_cliente: string | null;
  categoria: string;
}

export interface DreLinha {
  grupo: GrupoDre;
  label: string;
  valor: number;
  percentual: number;
  tipo: 'receita' | 'deducao' | 'custo' | 'despesa' | 'resultado';
  children?: DreLinha[];
  detalhes?: DreLancamentoDetalhe[];
}

export interface DreData {
  periodo: string;
  empresa_id: string;
  empresa_nome?: string;
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  custos: number;
  lucro_bruto: number;
  despesas_admin: number;
  despesas_comercial: number;
  despesas_financeira: number;
  despesas_tributaria: number;
  despesas_pessoal: number;
  despesas_marketing: number;
  despesas_operacional: number;
  total_despesas_operacionais: number;
  resultado_operacional: number;
  outras_receitas_despesas: number;
  lucro_antes_ir: number;
  ir_csll: number;
  lucro_liquido: number;
  linhas: DreLinha[];
}
