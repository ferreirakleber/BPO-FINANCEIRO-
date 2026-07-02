import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CA_API      = 'https://api.contaazul.com/v1';
const CA_TOKEN_URL = 'https://auth.contaazul.com/oauth2/token';
const CA_CLIENT_ID    = Deno.env.get('CA_CLIENT_ID')!;
const CA_CLIENT_SECRET = Deno.env.get('CA_CLIENT_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://bpo-financeiro-app.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Renovar access_token usando refresh_token
async function refreshToken(refreshToken: string) {
  const credentials = btoa(`${CA_CLIENT_ID}:${CA_CLIENT_SECRET}`);
  const res = await fetch(CA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('Falha ao renovar token');
  return res.json();
}

// Buscar dados da API do Conta Azul
async function fetchCA(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${CA_API}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CA API error ${res.status}: ${err}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { empresa_id, data_inicio, data_fim } = await req.json();
    if (!empresa_id) throw new Error('empresa_id obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Buscar integração da empresa
    const { data: integracao, error: errInt } = await supabase
      .from('integracoes_contaazul')
      .select('*')
      .eq('empresa_id', empresa_id)
      .single();

    if (errInt || !integracao) throw new Error('Empresa não conectada ao Conta Azul');

    let accessToken = integracao.access_token;

    // Renovar token se expirado
    const expiresAt = new Date(integracao.expires_at);
    if (expiresAt <= new Date()) {
      const newTokens = await refreshToken(integracao.refresh_token);
      accessToken = newTokens.access_token;
      await supabase.from('integracoes_contaazul').update({
        access_token:  newTokens.access_token,
        refresh_token: newTokens.refresh_token ?? integracao.refresh_token,
        expires_at:    new Date(Date.now() + (newTokens.expires_in ?? 3600) * 1000).toISOString(),
        updated_at:    new Date().toISOString(),
      }).eq('empresa_id', empresa_id);
    }

    // Log início
    const { data: log } = await supabase.from('sync_logs').insert({
      empresa_id, tipo: 'full', status: 'em_progresso',
    }).select().single();

    const inicio = data_inicio ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fim    = data_fim    ?? new Date().toISOString().split('T')[0];

    let totalImportados = 0;
    const lancamentos: any[] = [];

    // ── Buscar Contas a Receber (Receitas) ──
    try {
      const recebimentos = await fetchCA('/receivables', accessToken, {
        dtVencimentoInicio: inicio,
        dtVencimentoFim:    fim,
        status: 'TODOS',
      });
      console.log('RECEBIMENTOS RAW:', JSON.stringify(recebimentos).slice(0, 500));

      for (const r of (recebimentos?.items ?? recebimentos ?? [])) {
        lancamentos.push({
          empresa_id,
          descricao:           r.description ?? r.name ?? 'Recebimento',
          tipo:                'receita',
          valor:               parseFloat(r.value ?? r.amount ?? 0),
          data_vencimento:     r.due_date ?? r.dueDate ?? inicio,
          status:              r.status === 'RECEIVED' ? 'recebido' : 'pendente',
          data_pagamento:      r.payment_date ?? r.paymentDate ?? null,
          fornecedor_cliente:  r.person?.name ?? r.customer?.name ?? null,
          documento:           r.number ?? null,
          observacao:          `Importado Conta Azul · ID: ${r.id}`,
          ca_id:               String(r.id),
        });
      }
    } catch (e) {
      console.error('Erro ao buscar recebimentos:', e);
    }

    // ── Buscar Contas a Pagar (Despesas) ──
    try {
      const pagamentos = await fetchCA('/payables', accessToken, {
        dtVencimentoInicio: inicio,
        dtVencimentoFim:    fim,
        status: 'TODOS',
      });
      console.log('PAGAMENTOS RAW:', JSON.stringify(pagamentos).slice(0, 500));

      for (const p of (pagamentos?.items ?? pagamentos ?? [])) {
        lancamentos.push({
          empresa_id,
          descricao:          p.description ?? p.name ?? 'Pagamento',
          tipo:               'despesa',
          valor:              parseFloat(p.value ?? p.amount ?? 0),
          data_vencimento:    p.due_date ?? p.dueDate ?? inicio,
          status:             p.status === 'PAID' ? 'pago' : 'pendente',
          data_pagamento:     p.payment_date ?? p.paymentDate ?? null,
          fornecedor_cliente: p.person?.name ?? p.supplier?.name ?? null,
          documento:          p.number ?? null,
          observacao:         `Importado Conta Azul · ID: ${p.id}`,
          ca_id:              String(p.id),
        });
      }
    } catch (e) {
      console.error('Erro ao buscar pagamentos:', e);
    }

    // ── Inserir no banco (upsert por ca_id) ──
    if (lancamentos.length > 0) {
      // Buscar plano de contas padrão
      const { data: contas } = await supabase
        .from('plano_contas')
        .select('id, grupo_dre, tipo')
        .eq('empresa_id', empresa_id);

      const contaReceita = contas?.find((c: any) => c.grupo_dre === 'receita_bruta')?.id ?? contas?.[0]?.id;
      const contaDespesa = contas?.find((c: any) => c.tipo === 'despesa')?.id ?? contas?.[0]?.id;

      const lancamentosComConta = lancamentos.map((l) => ({
        ...l,
        plano_conta_id: l.tipo === 'receita' ? contaReceita : contaDespesa,
      }));

      // Remover ca_id antes de inserir (coluna não existe na tabela principal)
      const paraInserir = lancamentosComConta.map(({ ca_id, ...rest }) => rest);

      const { data: inserted, error: errIns } = await supabase
        .from('lancamentos')
        .insert(paraInserir)
        .select();

      if (errIns) throw errIns;
      totalImportados = inserted?.length ?? 0;
    }

    // Atualizar log e ultima_sync
    await supabase.from('sync_logs').update({
      status: 'sucesso',
      lancamentos_importados: totalImportados,
      concluido_em: new Date().toISOString(),
    }).eq('id', log?.id);

    await supabase.from('integracoes_contaazul').update({
      ultima_sync: new Date().toISOString(),
      status: 'ativo',
    }).eq('empresa_id', empresa_id);

    return new Response(JSON.stringify({ success: true, importados: totalImportados }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
