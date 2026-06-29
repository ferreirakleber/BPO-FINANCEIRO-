export type TipoLancamento = 'receita' | 'despesa' | 'transferencia';
export type StatusLancamento = 'pendente' | 'pago' | 'recebido' | 'cancelado';

export interface Lancamento {
  id: string;
  empresa_id: string;
  descricao: string;
  tipo: TipoLancamento;
  status: StatusLancamento;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  plano_conta_id: string;
  conta_bancaria_id: string | null;
  fornecedor_cliente: string | null;
  documento: string | null;
  observacao: string | null;
  conciliado: boolean;
  created_at: string;
  updated_at: string;
  // joins
  plano_conta?: { codigo: string; descricao: string };
  conta_bancaria?: { descricao: string };
}
