import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Usuario, Perfil } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _usuario = signal<Usuario | null>(null);
  private _loading = signal(true);

  usuario = this._usuario.asReadonly();
  loading = this._loading.asReadonly();
  isLoggedIn = computed(() => !!this._usuario());
  perfil = computed(() => this._usuario()?.perfil ?? null);
  isAdmin = computed(() => this._usuario()?.perfil === 'admin_geral');

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
  ) {
    this.initAuthListener();
  }

  private initAuthListener() {
    this.supabaseService.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && event !== 'SIGNED_IN') {
        await this.loadUsuario(session.user.id);
      } else if (!session) {
        this._usuario.set(null);
      }
      this._loading.set(false);
    });
  }

  private async loadUsuario(userId: string) {
    const { data, error } = await this.supabaseService.supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      this._usuario.set(data as Usuario);
    }
  }

  async login(email: string, password: string): Promise<string | null> {
    const { data, error } = await this.supabaseService.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return error.message;

    if (data.user) {
      await this.loadUsuario(data.user.id);
    }

    return null;
  }

  async logout() {
    await this.supabaseService.auth.signOut();
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(...roles: Perfil[]): boolean {
    const perfil = this.perfil();
    if (!perfil) return false;
    if (perfil === 'admin_geral') return true;
    return roles.includes(perfil);
  }
}
