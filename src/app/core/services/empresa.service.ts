import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Empresa } from '../models/empresa.model';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private _empresas = signal<Empresa[]>([]);
  private _empresaAtiva = signal<Empresa | null>(null);
  private _loading = signal(false);

  empresas = this._empresas.asReadonly();
  empresaAtiva = this._empresaAtiva.asReadonly();
  empresaAtivaId = computed(() => this._empresaAtiva()?.id ?? null);
  loading = this._loading.asReadonly();

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
  ) {}

  async loadEmpresas() {
    this._loading.set(true);

    let query = this.supabaseService.supabase
      .from('empresas')
      .select('*')
      .eq('ativa', true)
      .order('razao_social');

    if (!this.authService.isAdmin()) {
      const userId = this.authService.usuario()?.id;
      if (!userId) return;

      const { data: vinculos } = await this.supabaseService.supabase
        .from('usuario_empresas')
        .select('empresa_id')
        .eq('usuario_id', userId);

      const ids = vinculos?.map((v) => v.empresa_id) ?? [];
      if (ids.length === 0) {
        this._empresas.set([]);
        this._loading.set(false);
        return;
      }
      query = query.in('id', ids);
    }

    const { data } = await query;
    this._empresas.set((data as Empresa[]) ?? []);
    this._loading.set(false);

    if (this._empresas().length === 1) {
      this.setEmpresaAtiva(this._empresas()[0]);
    }
  }

  setEmpresaAtiva(empresa: Empresa) {
    this._empresaAtiva.set(empresa);
    localStorage.setItem('empresa_ativa_id', empresa.id);
  }

  async restoreEmpresaAtiva() {
    const savedId = localStorage.getItem('empresa_ativa_id');
    if (savedId) {
      const empresa = this._empresas().find((e) => e.id === savedId);
      if (empresa) {
        this._empresaAtiva.set(empresa);
      }
    }
  }

  async createEmpresa(empresa: Partial<Empresa>): Promise<Empresa | null> {
    const { data, error } = await this.supabaseService.supabase
      .from('empresas')
      .insert(empresa)
      .select()
      .single();

    if (data) {
      await this.loadEmpresas();
    }
    return (data as Empresa) ?? null;
  }

  async updateEmpresa(id: string, updates: Partial<Empresa>): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('empresas')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      await this.loadEmpresas();
    }
    return !error;
  }

  async deleteEmpresa(id: string): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('empresas')
      .update({ ativa: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      await this.loadEmpresas();
    }
    return !error;
  }
}
