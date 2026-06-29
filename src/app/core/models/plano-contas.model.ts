export type TipoConta = 'receita' | 'despesa' | 'custo' | 'deducao';

export type GrupoDre =
  | 'receita_bruta'
  | 'deducoes'
  | 'custos'
  | 'desp_admin'
  | 'desp_comercial'
  | 'desp_financeira'
  | 'desp_tributaria'
  | 'desp_pessoal'
  | 'desp_marketing'
  | 'desp_operacional'
  | 'outras_receitas_despesas'
  | 'ir_csll';

export interface PlanoConta {
  id: string;
  empresa_id: string;
  codigo: string;
  descricao: string;
  tipo: TipoConta;
  grupo_dre: GrupoDre;
  conta_pai_id: string | null;
  padrao: boolean;
  ativo: boolean;
  created_at: string;
  children?: PlanoConta[];
}
