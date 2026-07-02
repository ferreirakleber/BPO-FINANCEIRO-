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

    const { data, error } = await this.supabaseService.supabase
      .from('empresas')
      .select('*')
      .eq('ativa', true)
      .order('razao_social');

    this._empresas.set((data as Empresa[]) ?? []);
    this._loading.set(false);

    if (this._empresas().length === 1) {
      this.setEmpresaAtiva(this._empresas()[0]);
    }
  }

  setEmpresaAtiva(empresa: Empresa) {
    this._empresaAtiva.set(empresa);
    localStorage.setItem('empresa_ativa_id', empresa.id);
    this.aplicarTemaEmpresa(empresa);
  }

  aplicarTemaEmpresa(empresa: Empresa) {
    const cor = empresa.cor_primaria || '#3B82F6';
    const root = document.documentElement;
    root.style.setProperty('--accent', cor);
    root.style.setProperty('--empresa-cor', cor);
    root.style.setProperty('--empresa-cor-dark', this.darken(cor, 20));
    root.style.setProperty('--empresa-cor-light', cor + '22');
  }

  private darken(hex: string, pct: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - Math.round(((n >> 16) * pct) / 100));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round((((n >> 8) & 0xff) * pct) / 100));
    const b = Math.max(0, (n & 0xff) - Math.round(((n & 0xff) * pct) / 100));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  async restoreEmpresaAtiva() {
    const savedId = localStorage.getItem('empresa_ativa_id');
    if (savedId) {
      const empresa = this._empresas().find((e) => e.id === savedId);
      if (empresa) {
        this._empresaAtiva.set(empresa);
        this.aplicarTemaEmpresa(empresa);
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
