import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EmpresaService } from './empresa.service';
import { PlanoConta } from '../models/plano-contas.model';

const PLANO_PADRAO: Partial<PlanoConta>[] = [
  { codigo: '1', descricao: 'Receitas', tipo: 'receita', grupo_dre: 'receita_bruta' },
  { codigo: '1.1', descricao: 'Receita de Serviços', tipo: 'receita', grupo_dre: 'receita_bruta' },
  { codigo: '1.2', descricao: 'Receita de Vendas', tipo: 'receita', grupo_dre: 'receita_bruta' },
  { codigo: '2', descricao: 'Deduções', tipo: 'deducao', grupo_dre: 'deducoes' },
  { codigo: '2.1', descricao: 'Impostos sobre Receita', tipo: 'deducao', grupo_dre: 'deducoes' },
  { codigo: '2.2', descricao: 'Devoluções', tipo: 'deducao', grupo_dre: 'deducoes' },
  { codigo: '3', descricao: 'Custos', tipo: 'custo', grupo_dre: 'custos' },
  { codigo: '3.1', descricao: 'Custo dos Serviços Prestados', tipo: 'custo', grupo_dre: 'custos' },
  { codigo: '3.2', descricao: 'Custo das Mercadorias Vendidas', tipo: 'custo', grupo_dre: 'custos' },
  { codigo: '4', descricao: 'Despesas Operacionais', tipo: 'despesa', grupo_dre: 'desp_admin' },
  { codigo: '4.1', descricao: 'Despesas Administrativas', tipo: 'despesa', grupo_dre: 'desp_admin' },
  { codigo: '4.2', descricao: 'Despesas Comerciais', tipo: 'despesa', grupo_dre: 'desp_comercial' },
  { codigo: '4.3', descricao: 'Despesas Financeiras', tipo: 'despesa', grupo_dre: 'desp_financeira' },
  { codigo: '4.4', descricao: 'Despesas Tributárias', tipo: 'despesa', grupo_dre: 'desp_tributaria' },
  { codigo: '4.5', descricao: 'Despesas com Pessoal', tipo: 'despesa', grupo_dre: 'desp_pessoal' },
  { codigo: '4.6', descricao: 'Despesas com Marketing', tipo: 'despesa', grupo_dre: 'desp_marketing' },
  { codigo: '4.7', descricao: 'Despesas Operacionais Gerais', tipo: 'despesa', grupo_dre: 'desp_operacional' },
  { codigo: '5', descricao: 'Outras Receitas/Despesas', tipo: 'receita', grupo_dre: 'outras_receitas_despesas' },
  { codigo: '6', descricao: 'IR / CSLL', tipo: 'despesa', grupo_dre: 'ir_csll' },
];

@Injectable({ providedIn: 'root' })
export class PlanoContasService {
  private _contas = signal<PlanoConta[]>([]);
  private _loading = signal(false);

  contas = this._contas.asReadonly();
  loading = this._loading.asReadonly();

  constructor(
    private supabaseService: SupabaseService,
    private empresaService: EmpresaService,
  ) {}

  async loadContas() {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return;

    this._loading.set(true);
    const { data } = await this.supabaseService.supabase
      .from('plano_contas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('codigo');

    this._contas.set((data as PlanoConta[]) ?? []);
    this._loading.set(false);
  }

  buildTree(contas: PlanoConta[]): PlanoConta[] {
    const map = new Map<string, PlanoConta>();
    const roots: PlanoConta[] = [];

    contas.forEach((c) => map.set(c.id, { ...c, children: [] }));
    contas.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.conta_pai_id) {
        map.get(c.conta_pai_id)?.children?.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async createConta(conta: Partial<PlanoConta>): Promise<PlanoConta | null> {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return null;

    const { data } = await this.supabaseService.supabase
      .from('plano_contas')
      .insert({ ...conta, empresa_id: empresaId })
      .select()
      .single();

    if (data) await this.loadContas();
    return (data as PlanoConta) ?? null;
  }

  async updateConta(id: string, updates: Partial<PlanoConta>): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('plano_contas')
      .update(updates)
      .eq('id', id);

    if (!error) await this.loadContas();
    return !error;
  }

  async deleteConta(id: string): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('plano_contas')
      .update({ ativo: false })
      .eq('id', id);

    if (!error) await this.loadContas();
    return !error;
  }

  async seedPlanoPadrao(empresaId: string) {
    const contas = PLANO_PADRAO.map((c) => ({
      ...c,
      empresa_id: empresaId,
      padrao: true,
      ativo: true,
    }));

    await this.supabaseService.supabase.from('plano_contas').insert(contas);
  }
}
