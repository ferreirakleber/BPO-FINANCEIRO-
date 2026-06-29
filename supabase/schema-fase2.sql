-- ============================================
-- FASE 2: Lançamentos + Contas Bancárias
-- ============================================

CREATE TYPE tipo_lancamento AS ENUM ('receita', 'despesa', 'transferencia');
CREATE TYPE status_lancamento AS ENUM ('pendente', 'pago', 'recebido', 'cancelado');

-- Contas Bancárias
CREATE TABLE contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  banco VARCHAR(100) NOT NULL,
  agencia VARCHAR(20) NOT NULL,
  conta VARCHAR(30) NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  saldo_inicial NUMERIC(15,2) DEFAULT 0,
  saldo_atual NUMERIC(15,2) DEFAULT 0,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contas_bancarias_empresa ON contas_bancarias(empresa_id);

-- Lançamentos Financeiros
CREATE TABLE lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao VARCHAR(300) NOT NULL,
  tipo tipo_lancamento NOT NULL,
  status status_lancamento NOT NULL DEFAULT 'pendente',
  valor NUMERIC(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  plano_conta_id UUID NOT NULL REFERENCES plano_contas(id),
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),
  fornecedor_cliente VARCHAR(200),
  documento VARCHAR(100),
  observacao TEXT,
  conciliado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lancamentos_empresa ON lancamentos(empresa_id);
CREATE INDEX idx_lancamentos_vencimento ON lancamentos(data_vencimento);
CREATE INDEX idx_lancamentos_status ON lancamentos(status);
CREATE INDEX idx_lancamentos_tipo ON lancamentos(tipo);

-- RLS
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

-- Políticas: contas_bancarias
CREATE POLICY "Usuarios veem contas de suas empresas" ON contas_bancarias
  FOR SELECT USING (is_admin() OR empresa_id IN (SELECT user_empresa_ids()));

CREATE POLICY "Admin gerencia contas bancarias" ON contas_bancarias
  FOR ALL USING (is_admin());

CREATE POLICY "Financeiro e gestor gerenciam contas bancarias" ON contas_bancarias
  FOR ALL USING (
    empresa_id IN (SELECT user_empresa_ids())
    AND EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil IN ('financeiro', 'gestor')
    )
  );

-- Políticas: lancamentos
CREATE POLICY "Usuarios veem lancamentos de suas empresas" ON lancamentos
  FOR SELECT USING (is_admin() OR empresa_id IN (SELECT user_empresa_ids()));

CREATE POLICY "Admin gerencia lancamentos" ON lancamentos
  FOR ALL USING (is_admin());

CREATE POLICY "Financeiro gerencia lancamentos" ON lancamentos
  FOR ALL USING (
    empresa_id IN (SELECT user_empresa_ids())
    AND EXISTS (
      SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil IN ('financeiro', 'gestor')
    )
  );
