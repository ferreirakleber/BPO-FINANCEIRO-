-- Enum de perfis
CREATE TYPE perfil_tipo AS ENUM ('admin_geral', 'financeiro', 'gestor', 'consulta', 'auditor');

-- Enum de tipo de conta
CREATE TYPE tipo_conta AS ENUM ('receita', 'despesa', 'custo', 'deducao');

-- Enum de grupo DRE
CREATE TYPE grupo_dre AS ENUM (
  'receita_bruta', 'deducoes', 'custos',
  'desp_admin', 'desp_comercial', 'desp_financeira',
  'desp_tributaria', 'desp_pessoal', 'desp_marketing',
  'desp_operacional', 'outras_receitas_despesas', 'ir_csll'
);

-- Empresas
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuários (vinculado ao auth.users)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  perfil perfil_tipo NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo usuário <-> empresa (N:N)
CREATE TABLE usuario_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  UNIQUE(usuario_id, empresa_id)
);

-- Plano de Contas
CREATE TABLE plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  tipo tipo_conta NOT NULL,
  grupo_dre grupo_dre NOT NULL,
  conta_pai_id UUID REFERENCES plano_contas(id),
  padrao BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plano_contas_empresa ON plano_contas(empresa_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: verifica se é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin_geral'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Função auxiliar: retorna empresa_ids do usuário
CREATE OR REPLACE FUNCTION user_empresa_ids()
RETURNS SETOF UUID AS $$
  SELECT empresa_id FROM usuario_empresas WHERE usuario_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Políticas: empresas
CREATE POLICY "Usuarios veem suas empresas" ON empresas
  FOR SELECT USING (
    is_admin() OR id IN (SELECT user_empresa_ids())
  );

CREATE POLICY "Admin gerencia empresas" ON empresas
  FOR ALL USING (is_admin());

-- Políticas: usuarios
CREATE POLICY "Admin gerencia usuarios" ON usuarios
  FOR ALL USING (is_admin());

CREATE POLICY "Usuario ve proprio perfil" ON usuarios
  FOR SELECT USING (id = auth.uid());

-- Políticas: usuario_empresas
CREATE POLICY "Admin gerencia vinculos" ON usuario_empresas
  FOR ALL USING (is_admin());

CREATE POLICY "Usuario ve proprios vinculos" ON usuario_empresas
  FOR SELECT USING (usuario_id = auth.uid());

-- Políticas: plano_contas
CREATE POLICY "Usuarios veem contas de suas empresas" ON plano_contas
  FOR SELECT USING (
    is_admin() OR empresa_id IN (SELECT user_empresa_ids())
  );

CREATE POLICY "Admin gerencia plano de contas" ON plano_contas
  FOR ALL USING (is_admin());

CREATE POLICY "Financeiro e gestor gerenciam plano de contas" ON plano_contas
  FOR ALL USING (
    empresa_id IN (SELECT user_empresa_ids())
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND perfil IN ('financeiro', 'gestor')
    )
  );
