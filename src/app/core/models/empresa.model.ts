export interface Empresa {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  ativa: boolean;
  logo_url: string | null;
  cor_primaria: string | null;
  created_at: string;
  updated_at: string;
}
