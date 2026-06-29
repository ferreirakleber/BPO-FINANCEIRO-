import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EmpresaService } from './empresa.service';
import { Lancamento, StatusLancamento } from '../models/lancamento.model';

export interface LancamentoFiltro {
  tipo?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  planoContaId?: string;
  contaBancariaId?: string;
}

@Injectable({ providedIn: 'root' })
export class LancamentoService {
  private _lancamentos = signal<Lancamento[]>([]);
  private _loading = signal(false);

  lancamentos = this._lancamentos.asReadonly();
  loading = this._loading.asReadonly();

  constructor(
    private supabaseService: SupabaseService,
    private empresaService: EmpresaService,
  ) {}

  async loadLancamentos(filtro?: LancamentoFiltro) {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return;

    this._loading.set(true);

    let query = this.supabaseService.supabase
      .from('lancamentos')
      .select('*, plano_conta:plano_contas(codigo, descricao), conta_bancaria:contas_bancarias(descricao)')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: false });

    if (filtro?.tipo) query = query.eq('tipo', filtro.tipo);
    if (filtro?.status) query = query.eq('status', filtro.status);
    if (filtro?.dataInicio) query = query.gte('data_vencimento', filtro.dataInicio);
    if (filtro?.dataFim) query = query.lte('data_vencimento', filtro.dataFim);
    if (filtro?.planoContaId) query = query.eq('plano_conta_id', filtro.planoContaId);
    if (filtro?.contaBancariaId) query = query.eq('conta_bancaria_id', filtro.contaBancariaId);

    const { data } = await query;
    this._lancamentos.set((data as Lancamento[]) ?? []);
    this._loading.set(false);
  }

  async create(lancamento: Partial<Lancamento>): Promise<Lancamento | null> {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return null;

    const { data } = await this.supabaseService.supabase
      .from('lancamentos')
      .insert({ ...lancamento, empresa_id: empresaId })
      .select()
      .single();

    if (data) await this.loadLancamentos();
    return (data as Lancamento) ?? null;
  }

  async update(id: string, updates: Partial<Lancamento>): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('lancamentos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) await this.loadLancamentos();
    return !error;
  }

  async updateStatus(id: string, status: StatusLancamento, dataPagamento?: string): Promise<boolean> {
    const updates: Partial<Lancamento> = {
      status,
      updated_at: new Date().toISOString(),
    } as any;

    if (dataPagamento) {
      (updates as any).data_pagamento = dataPagamento;
    }

    const { error } = await this.supabaseService.supabase
      .from('lancamentos')
      .update(updates)
      .eq('id', id);

    if (!error) await this.loadLancamentos();
    return !error;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('lancamentos')
      .update({ status: 'cancelado' as StatusLancamento, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) await this.loadLancamentos();
    return !error;
  }

  async supabaseInsert(lancamentos: any[]): Promise<{ data: any[] | null }> {
    const { data } = await this.supabaseService.supabase
      .from('lancamentos')
      .insert(lancamentos)
      .select();
    return { data };
  }

  async importFromCsv(rows: Partial<Lancamento>[]): Promise<number> {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return 0;

    const lancamentos = rows.map((r) => ({ ...r, empresa_id: empresaId }));
    const { data } = await this.supabaseService.supabase
      .from('lancamentos')
      .insert(lancamentos)
      .select();

    if (data) {
      await this.loadLancamentos();
      return data.length;
    }
    return 0;
  }
}
