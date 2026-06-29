import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Usuario, UsuarioEmpresa } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private _usuarios = signal<Usuario[]>([]);
  private _loading = signal(false);

  usuarios = this._usuarios.asReadonly();
  loading = this._loading.asReadonly();

  constructor(private supabaseService: SupabaseService) {}

  async loadUsuarios() {
    this._loading.set(true);
    const { data } = await this.supabaseService.supabase
      .from('usuarios')
      .select('*')
      .order('nome');

    this._usuarios.set((data as Usuario[]) ?? []);
    this._loading.set(false);
  }

  async getUsuarioEmpresas(usuarioId: string): Promise<string[]> {
    const { data } = await this.supabaseService.supabase
      .from('usuario_empresas')
      .select('empresa_id')
      .eq('usuario_id', usuarioId);

    return data?.map((d) => d.empresa_id) ?? [];
  }

  async createUsuario(
    usuario: Partial<Usuario>,
    empresaIds: string[],
    password: string,
  ): Promise<string | null> {
    const { data: authData, error: authError } =
      await this.supabaseService.auth.admin.createUser({
        email: usuario.email!,
        password,
        email_confirm: true,
      });

    if (authError) return authError.message;

    const userId = authData.user.id;

    await this.supabaseService.supabase.from('usuarios').insert({
      id: userId,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: true,
    });

    if (empresaIds.length > 0) {
      const vinculos = empresaIds.map((empresaId) => ({
        usuario_id: userId,
        empresa_id: empresaId,
      }));
      await this.supabaseService.supabase
        .from('usuario_empresas')
        .insert(vinculos);
    }

    await this.loadUsuarios();
    return null;
  }

  async updateUsuario(id: string, updates: Partial<Usuario>): Promise<boolean> {
    const { error } = await this.supabaseService.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', id);

    if (!error) await this.loadUsuarios();
    return !error;
  }

  async updateUsuarioEmpresas(
    usuarioId: string,
    empresaIds: string[],
  ): Promise<boolean> {
    await this.supabaseService.supabase
      .from('usuario_empresas')
      .delete()
      .eq('usuario_id', usuarioId);

    if (empresaIds.length > 0) {
      const vinculos = empresaIds.map((empresaId) => ({
        usuario_id: usuarioId,
        empresa_id: empresaId,
      }));
      const { error } = await this.supabaseService.supabase
        .from('usuario_empresas')
        .insert(vinculos);
      return !error;
    }

    return true;
  }
}
