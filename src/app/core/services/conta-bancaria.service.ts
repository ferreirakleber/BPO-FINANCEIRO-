import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EmpresaService } from './empresa.service';
import { ContaBancaria } from '../models/conta-bancaria.model';

@Injectable({ providedIn: 'root' })
export class ContaBancariaService {
  private _contas = signal<ContaBancaria[]>([]);
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
      .from('contas_bancarias')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativa', true)
      .order('descricao');

    this._contas.set((data as ContaBancaria[]) ?? []);
    this._loading.set(false);
  }

  async create(conta: Partial<ContaBancaria>): Promise<ContaBancaria | null> {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return null;

    const { data } = await this.supabaseService.supabase
      .from('contas_bancarias')
      .insert({ ...conta, empresa_id: empresaId, saldo_atual: conta.saldo_inicial ?? 0 })
      .select()
      .single();

    if (data) await this.loadContas();
    return (data as ContaBancaria) ?? null;
  }

  async update(id: string, updates: Partial<ContaBancaria>): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('contas_bancarias')
      .update(updates)
      .eq('id', id);

    if (!error) await this.loadContas();
    return !error;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('contas_bancarias')
      .update({ ativa: false })
      .eq('id', id);

    if (!error) await this.loadContas();
    return !error;
  }
}
