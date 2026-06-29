import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EmpresaService } from './empresa.service';
import { DreData, DreLinha, DreLancamentoDetalhe } from '../models/dre.model';
import { GrupoDre } from '../models/plano-contas.model';

const GRUPO_LABELS: Record<GrupoDre, string> = {
  receita_bruta: 'Receita Bruta',
  deducoes: 'Deduções',
  custos: 'Custos',
  desp_admin: 'Despesas Administrativas',
  desp_comercial: 'Despesas Comerciais',
  desp_financeira: 'Despesas Financeiras',
  desp_tributaria: 'Despesas Tributárias',
  desp_pessoal: 'Despesas com Pessoal',
  desp_marketing: 'Despesas com Marketing',
  desp_operacional: 'Despesas Operacionais Gerais',
  depreciacao_amortizacao: 'Depreciação e Amortização',
  outras_receitas_despesas: 'Outras Receitas/Despesas',
  ir_csll: 'IR / CSLL',
};

@Injectable({ providedIn: 'root' })
export class DreService {
  private _dreData = signal<DreData | null>(null);
  private _dreComparativo = signal<DreData[]>([]);
  private _loading = signal(false);

  dreData = this._dreData.asReadonly();
  dreComparativo = this._dreComparativo.asReadonly();
  loading = this._loading.asReadonly();

  constructor(
    private supabaseService: SupabaseService,
    private empresaService: EmpresaService,
  ) {}

  async loadDreLancamentos(empresaId: string, dataInicio: string, dataFim: string): Promise<any[]> {
    const { data } = await this.supabaseService.supabase
      .from('lancamentos')
      .select('id, descricao, valor, tipo, data_vencimento, status, fornecedor_cliente, plano_conta:plano_contas(codigo, descricao, grupo_dre)')
      .eq('empresa_id', empresaId)
      .in('status', ['pago', 'recebido'])
      .gte('data_vencimento', dataInicio)
      .lte('data_vencimento', dataFim)
      .order('data_vencimento');

    return data ?? [];
  }

  async loadDre(empresaId: string, dataInicio: string, dataFim: string, empresaNome?: string): Promise<DreData> {
    const lancamentos = await this.loadDreLancamentos(empresaId, dataInicio, dataFim);

    const totais: Record<string, number> = {};
    const detalhesPorGrupo: Record<string, any[]> = {};

    for (const l of lancamentos) {
      const grupo = (l as any).plano_conta?.grupo_dre;
      if (!grupo) continue;
      totais[grupo] = (totais[grupo] ?? 0) + Number(l.valor);

      if (!detalhesPorGrupo[grupo]) detalhesPorGrupo[grupo] = [];
      detalhesPorGrupo[grupo].push({
        id: l.id,
        descricao: l.descricao,
        valor: Number(l.valor),
        data_vencimento: l.data_vencimento,
        fornecedor_cliente: l.fornecedor_cliente,
        categoria: (l as any).plano_conta?.descricao ?? '',
      });
    }

    const get = (g: GrupoDre) => totais[g] ?? 0;
    const getDetalhes = (g: GrupoDre) => detalhesPorGrupo[g] ?? [];

    const receita_bruta = get('receita_bruta');
    const deducoes = get('deducoes');
    const receita_liquida = receita_bruta - deducoes;
    const custos = get('custos');
    const lucro_bruto = receita_liquida - custos;

    const despesas_admin = get('desp_admin');
    const despesas_comercial = get('desp_comercial');
    const despesas_financeira = get('desp_financeira');
    const despesas_tributaria = get('desp_tributaria');
    const despesas_pessoal = get('desp_pessoal');
    const despesas_marketing = get('desp_marketing');
    const despesas_operacional = get('desp_operacional');
    const total_despesas_operacionais = despesas_admin + despesas_comercial + despesas_financeira +
      despesas_tributaria + despesas_pessoal + despesas_marketing + despesas_operacional;

    const resultado_operacional = lucro_bruto - total_despesas_operacionais;
    const depreciacao_amortizacao = get('depreciacao_amortizacao');
    const ebitda = resultado_operacional + depreciacao_amortizacao;
    const outras_receitas_despesas = get('outras_receitas_despesas');
    const lucro_antes_ir = resultado_operacional + outras_receitas_despesas;
    const ir_csll = get('ir_csll');
    const lucro_liquido = lucro_antes_ir - ir_csll;

    const pct = (v: number) => receita_bruta > 0 ? (v / receita_bruta) * 100 : 0;
    const margem_bruta = pct(lucro_bruto);
    const margem_ebitda = pct(ebitda);
    const margem_liquida = pct(lucro_liquido);

    const linhas: DreLinha[] = [
      // Receita
      { grupo: 'receita_bruta', label: 'Receita Bruta', valor: receita_bruta, percentual: 100, tipo: 'receita', detalhes: getDetalhes('receita_bruta') },
      { grupo: 'deducoes', label: '(-) Deduções sobre Receita', valor: deducoes, percentual: pct(deducoes), tipo: 'deducao', detalhes: getDetalhes('deducoes') },
      { grupo: 'receita_bruta', label: '= Receita Líquida', valor: receita_liquida, percentual: pct(receita_liquida), tipo: 'resultado' },

      // Custos
      { grupo: 'custos', label: '(-) Custos dos Serviços/Produtos', valor: custos, percentual: pct(custos), tipo: 'custo', detalhes: getDetalhes('custos') },
      { grupo: 'custos', label: '= Lucro Bruto', valor: lucro_bruto, percentual: pct(lucro_bruto), tipo: 'resultado' },
      { grupo: 'custos', label: '  Margem Bruta', valor: margem_bruta, percentual: margem_bruta, tipo: 'resultado', destaque: true },

      // Despesas Operacionais
      {
        grupo: 'desp_admin', label: '(-) Despesas Operacionais', valor: total_despesas_operacionais, percentual: pct(total_despesas_operacionais), tipo: 'despesa',
        children: [
          { grupo: 'desp_admin', label: 'Administrativas', valor: despesas_admin, percentual: pct(despesas_admin), tipo: 'despesa', detalhes: getDetalhes('desp_admin') },
          { grupo: 'desp_comercial', label: 'Comerciais', valor: despesas_comercial, percentual: pct(despesas_comercial), tipo: 'despesa', detalhes: getDetalhes('desp_comercial') },
          { grupo: 'desp_financeira', label: 'Financeiras', valor: despesas_financeira, percentual: pct(despesas_financeira), tipo: 'despesa', detalhes: getDetalhes('desp_financeira') },
          { grupo: 'desp_tributaria', label: 'Tributárias', valor: despesas_tributaria, percentual: pct(despesas_tributaria), tipo: 'despesa', detalhes: getDetalhes('desp_tributaria') },
          { grupo: 'desp_pessoal', label: 'Pessoal', valor: despesas_pessoal, percentual: pct(despesas_pessoal), tipo: 'despesa', detalhes: getDetalhes('desp_pessoal') },
          { grupo: 'desp_marketing', label: 'Marketing', valor: despesas_marketing, percentual: pct(despesas_marketing), tipo: 'despesa', detalhes: getDetalhes('desp_marketing') },
          { grupo: 'desp_operacional', label: 'Operacionais Gerais', valor: despesas_operacional, percentual: pct(despesas_operacional), tipo: 'despesa', detalhes: getDetalhes('desp_operacional') },
          { grupo: 'depreciacao_amortizacao', label: 'Depreciação e Amortização', valor: depreciacao_amortizacao, percentual: pct(depreciacao_amortizacao), tipo: 'despesa', detalhes: getDetalhes('depreciacao_amortizacao') },
        ],
      },

      // Resultado Operacional
      { grupo: 'desp_operacional', label: '= Resultado Operacional (EBIT)', valor: resultado_operacional, percentual: pct(resultado_operacional), tipo: 'resultado' },

      // EBITDA
      { grupo: 'depreciacao_amortizacao', label: '(+) Depreciação e Amortização', valor: depreciacao_amortizacao, percentual: pct(depreciacao_amortizacao), tipo: 'despesa', detalhes: getDetalhes('depreciacao_amortizacao') },
      { grupo: 'depreciacao_amortizacao', label: '= EBITDA', valor: ebitda, percentual: pct(ebitda), tipo: 'ebitda', destaque: true },
      { grupo: 'depreciacao_amortizacao', label: '  Margem EBITDA', valor: margem_ebitda, percentual: margem_ebitda, tipo: 'ebitda', destaque: true },

      // Resultado Final
      { grupo: 'outras_receitas_despesas', label: '(+/-) Outras Receitas/Despesas', valor: outras_receitas_despesas, percentual: pct(outras_receitas_despesas), tipo: 'receita', detalhes: getDetalhes('outras_receitas_despesas') },
      { grupo: 'outras_receitas_despesas', label: '= Lucro Antes do IR (EBT)', valor: lucro_antes_ir, percentual: pct(lucro_antes_ir), tipo: 'resultado' },
      { grupo: 'ir_csll', label: '(-) IR / CSLL', valor: ir_csll, percentual: pct(ir_csll), tipo: 'despesa', detalhes: getDetalhes('ir_csll') },
      { grupo: 'ir_csll', label: '= Lucro Líquido', valor: lucro_liquido, percentual: pct(lucro_liquido), tipo: 'resultado', destaque: true },
      { grupo: 'ir_csll', label: '  Margem Líquida', valor: margem_liquida, percentual: margem_liquida, tipo: 'resultado', destaque: true },
    ];

    const dre: DreData = {
      periodo: `${dataInicio} a ${dataFim}`,
      empresa_id: empresaId,
      empresa_nome: empresaNome,
      receita_bruta, deducoes, receita_liquida, custos, lucro_bruto, margem_bruta,
      despesas_admin, despesas_comercial, despesas_financeira,
      despesas_tributaria, despesas_pessoal, despesas_marketing,
      despesas_operacional, total_despesas_operacionais,
      resultado_operacional, depreciacao_amortizacao, ebitda, margem_ebitda,
      outras_receitas_despesas,
      lucro_antes_ir, ir_csll, lucro_liquido, margem_liquida, linhas,
    };

    return dre;
  }

  async loadDreEmpresa(dataInicio: string, dataFim: string) {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return;

    this._loading.set(true);
    const empresa = this.empresaService.empresaAtiva();
    const dre = await this.loadDre(empresaId, dataInicio, dataFim, empresa?.nome_fantasia ?? empresa?.razao_social);
    this._dreData.set(dre);
    this._loading.set(false);
  }

  async loadDreConsolidada(dataInicio: string, dataFim: string) {
    this._loading.set(true);
    const empresas = this.empresaService.empresas();
    const dres: DreData[] = [];

    for (const emp of empresas) {
      const dre = await this.loadDre(emp.id, dataInicio, dataFim, emp.nome_fantasia ?? emp.razao_social);
      dres.push(dre);
    }

    this._dreComparativo.set(dres);

    // Consolidada = soma de todas
    if (dres.length > 0) {
      const consolidada: DreData = { ...dres[0], empresa_nome: 'CONSOLIDADO', empresa_id: 'consolidado' };
      for (let i = 1; i < dres.length; i++) {
        consolidada.receita_bruta += dres[i].receita_bruta;
        consolidada.deducoes += dres[i].deducoes;
        consolidada.receita_liquida += dres[i].receita_liquida;
        consolidada.custos += dres[i].custos;
        consolidada.lucro_bruto += dres[i].lucro_bruto;
        consolidada.despesas_admin += dres[i].despesas_admin;
        consolidada.despesas_comercial += dres[i].despesas_comercial;
        consolidada.despesas_financeira += dres[i].despesas_financeira;
        consolidada.despesas_tributaria += dres[i].despesas_tributaria;
        consolidada.despesas_pessoal += dres[i].despesas_pessoal;
        consolidada.despesas_marketing += dres[i].despesas_marketing;
        consolidada.despesas_operacional += dres[i].despesas_operacional;
        consolidada.total_despesas_operacionais += dres[i].total_despesas_operacionais;
        consolidada.resultado_operacional += dres[i].resultado_operacional;
        consolidada.outras_receitas_despesas += dres[i].outras_receitas_despesas;
        consolidada.lucro_antes_ir += dres[i].lucro_antes_ir;
        consolidada.ir_csll += dres[i].ir_csll;
        consolidada.lucro_liquido += dres[i].lucro_liquido;
      }

      // Recalcular linhas e percentuais da consolidada
      const rb = consolidada.receita_bruta;
      const pct = (v: number) => rb > 0 ? (v / rb) * 100 : 0;
      consolidada.linhas = [
        { grupo: 'receita_bruta', label: 'Receita Bruta', valor: rb, percentual: 100, tipo: 'receita' },
        { grupo: 'deducoes', label: '(-) Deduções', valor: consolidada.deducoes, percentual: pct(consolidada.deducoes), tipo: 'deducao' },
        { grupo: 'receita_bruta', label: '= Receita Líquida', valor: consolidada.receita_liquida, percentual: pct(consolidada.receita_liquida), tipo: 'resultado' },
        { grupo: 'custos', label: '(-) Custos', valor: consolidada.custos, percentual: pct(consolidada.custos), tipo: 'custo' },
        { grupo: 'custos', label: '= Lucro Bruto', valor: consolidada.lucro_bruto, percentual: pct(consolidada.lucro_bruto), tipo: 'resultado' },
        {
          grupo: 'desp_admin', label: '(-) Despesas Operacionais', valor: consolidada.total_despesas_operacionais, percentual: pct(consolidada.total_despesas_operacionais), tipo: 'despesa',
          children: [
            { grupo: 'desp_admin', label: 'Administrativas', valor: consolidada.despesas_admin, percentual: pct(consolidada.despesas_admin), tipo: 'despesa' },
            { grupo: 'desp_comercial', label: 'Comerciais', valor: consolidada.despesas_comercial, percentual: pct(consolidada.despesas_comercial), tipo: 'despesa' },
            { grupo: 'desp_financeira', label: 'Financeiras', valor: consolidada.despesas_financeira, percentual: pct(consolidada.despesas_financeira), tipo: 'despesa' },
            { grupo: 'desp_tributaria', label: 'Tributárias', valor: consolidada.despesas_tributaria, percentual: pct(consolidada.despesas_tributaria), tipo: 'despesa' },
            { grupo: 'desp_pessoal', label: 'Pessoal', valor: consolidada.despesas_pessoal, percentual: pct(consolidada.despesas_pessoal), tipo: 'despesa' },
            { grupo: 'desp_marketing', label: 'Marketing', valor: consolidada.despesas_marketing, percentual: pct(consolidada.despesas_marketing), tipo: 'despesa' },
            { grupo: 'desp_operacional', label: 'Operacionais Gerais', valor: consolidada.despesas_operacional, percentual: pct(consolidada.despesas_operacional), tipo: 'despesa' },
          ],
        },
        { grupo: 'desp_operacional', label: '= Resultado Operacional', valor: consolidada.resultado_operacional, percentual: pct(consolidada.resultado_operacional), tipo: 'resultado' },
        { grupo: 'outras_receitas_despesas', label: '(+/-) Outras Receitas/Despesas', valor: consolidada.outras_receitas_despesas, percentual: pct(consolidada.outras_receitas_despesas), tipo: 'receita' },
        { grupo: 'outras_receitas_despesas', label: '= Lucro Antes do IR', valor: consolidada.lucro_antes_ir, percentual: pct(consolidada.lucro_antes_ir), tipo: 'resultado' },
        { grupo: 'ir_csll', label: '(-) IR / CSLL', valor: consolidada.ir_csll, percentual: pct(consolidada.ir_csll), tipo: 'despesa' },
        { grupo: 'ir_csll', label: '= Lucro Líquido', valor: consolidada.lucro_liquido, percentual: pct(consolidada.lucro_liquido), tipo: 'resultado' },
      ];

      this._dreData.set(consolidada);
    }

    this._loading.set(false);
  }

  async loadDreMultiPeriodos(empresaId: string, periodos: { inicio: string; fim: string; label: string }[]): Promise<DreData[]> {
    const empresa = this.empresaService.empresas().find((e) => e.id === empresaId);
    const nome = empresa?.nome_fantasia ?? empresa?.razao_social ?? '';
    const dres: DreData[] = [];

    for (const p of periodos) {
      const dre = await this.loadDre(empresaId, p.inicio, p.fim, nome);
      dre.periodo = p.label;
      dres.push(dre);
    }

    return dres;
  }
}
