export interface ContaBancaria {
  id: string;
  empresa_id: string;
  banco: string;
  agencia: string;
  conta: string;
  descricao: string;
  saldo_inicial: number;
  saldo_atual: number;
  ativa: boolean;
  created_at: string;
}
