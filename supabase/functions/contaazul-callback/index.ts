import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CA_TOKEN_URL    = 'https://auth.contaazul.com/oauth2/token';
const CA_CLIENT_ID    = Deno.env.get('CA_CLIENT_ID')!;
const CA_CLIENT_SECRET = Deno.env.get('CA_CLIENT_SECRET')!;
const REDIRECT_URI    = 'https://bpo-financeiro-app.vercel.app/integracoes/callback';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://bpo-financeiro-app.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, empresa_id } = await req.json();

    if (!code || !empresa_id) {
      return new Response(JSON.stringify({ error: 'code e empresa_id obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trocar code por access_token — Cognito requer Basic Auth no header
    const credentials = btoa(`${CA_CLIENT_ID}:${CA_CLIENT_SECRET}`);
    const tokenRes = await fetch(CA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    const tokenBody = await tokenRes.text();
    console.log('TOKEN RESPONSE STATUS:', tokenRes.status);
    console.log('TOKEN RESPONSE BODY:', tokenBody.slice(0, 500));

    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao obter token', detail: tokenBody }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokens = JSON.parse(tokenBody);
    console.log('TOKEN KEYS:', Object.keys(tokens).join(', '));
    console.log('ACCESS TOKEN PREFIX:', (tokens.access_token ?? '').slice(0, 30));
    console.log('ID TOKEN EXISTS:', !!tokens.id_token);
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

    // Salvar tokens no Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('integracoes_contaazul')
      .upsert({
        empresa_id,
        access_token:  tokens.id_token ?? tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type:    tokens.token_type ?? 'Bearer',
        expires_at:    expiresAt,
        scope:         tokens.scope,
        status:        'ativo',
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
