export interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}
