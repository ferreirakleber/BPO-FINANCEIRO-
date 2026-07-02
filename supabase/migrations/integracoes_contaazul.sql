-- Tabela para armazenar tokens OAuth do Conta Azul por empresa
CREATE TABLE IF NOT EXISTS integracoes_contaazul (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  access_token    text NOT NULL,
  refresh_token   text,
  token_type      text DEFAULT 'Bearer',
  expires_at      timestamptz,
  scope           text,
  ca_user_id      text,
  ultima_sync     timestamptz,
  status          text DEFAULT 'ativo' CHECK (status IN ('ativo', 'erro', 'expirado')),
  erro_msg        text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (empresa_id)
);

-- Log de sincronizações
CREATE TABLE IF NOT EXISTS sync_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo            text NOT NULL, -- 'recebimentos' | 'pagamentos' | 'full'
  status          text NOT NULL CHECK (status IN ('sucesso', 'erro', 'em_progresso')),
  lancamentos_importados integer DEFAULT 0,
  lancamentos_atualizados integer DEFAULT 0,
  erro_msg        text,
  iniciado_em     timestamptz DEFAULT now(),
  concluido_em    timestamptz
);

-- RLS
ALTER TABLE integracoes_contaazul ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios podem ver integracoes da sua empresa"
  ON integracoes_contaazul FOR ALL
  USING (empresa_id = ANY(user_empresa_ids()));

CREATE POLICY "usuarios podem ver logs da sua empresa"
  ON sync_logs FOR SELECT
  USING (empresa_id = ANY(user_empresa_ids()));

-- Índices
CREATE INDEX idx_integracoes_empresa ON integracoes_contaazul(empresa_id);
CREATE INDEX idx_sync_logs_empresa ON sync_logs(empresa_id);
