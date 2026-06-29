export type Perfil = 'admin_geral' | 'financeiro' | 'gestor' | 'consulta' | 'auditor';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  created_at: string;
}

export interface UsuarioEmpresa {
  id: string;
  usuario_id: string;
  empresa_id: string;
}
