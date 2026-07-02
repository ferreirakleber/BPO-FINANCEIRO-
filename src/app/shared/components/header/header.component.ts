import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { CnpjPipe } from '../../pipes/cnpj.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule, CnpjPipe],
  template: `
    <header class="header">
      <div class="header-left">
        @if (empresaService.empresaAtiva(); as empresa) {
          <div class="empresa-chip">
            @if (empresa.logo_url) {
              <img [src]="empresa.logo_url" class="empresa-logo" [alt]="empresa.nome_fantasia || empresa.razao_social" />
            } @else {
              <div class="empresa-avatar" [style.background]="empresa.cor_primaria || 'var(--accent)'">
                {{ (empresa.nome_fantasia || empresa.razao_social).charAt(0) }}
              </div>
            }
            <div>
              <span class="empresa-name">{{ empresa.nome_fantasia || empresa.razao_social }}</span>
              <span class="empresa-cnpj">{{ empresa.cnpj | cnpj }}</span>
            </div>
          </div>
        }
      </div>

      <div class="header-right">
        @if (empresaService.empresas().length > 1) {
          <button class="header-btn" (click)="trocarEmpresa()" title="Trocar empresa">
            <i class="pi pi-sync"></i>
            <span>Trocar Empresa</span>
          </button>
        }

        <button class="header-btn theme-btn" (click)="toggleTheme()" [title]="darkMode() ? 'Modo claro' : 'Modo escuro'">
          <i [class]="darkMode() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          <span>{{ darkMode() ? 'Claro' : 'Escuro' }}</span>
        </button>

        <div class="divider"></div>

        <div class="user-avatar-area">
          <div class="avatar">{{ initials() }}</div>
          <div class="user-info">
            <span class="user-name">{{ authService.usuario()?.nome }}</span>
            <span class="user-role">{{ authService.usuario()?.perfil | titlecase }}</span>
          </div>
        </div>

        <button class="logout-btn" (click)="logout()" title="Sair">
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </header>
  `,
  styles: `
    .header {
      height: var(--header-h, 64px);
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 100;
      transition: background 0.3s, border-color 0.3s;
    }

    /* ── Left ── */
    .empresa-chip {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      background: var(--bg-hover);
      border: 1px solid var(--border);
      padding: 0.4rem 0.875rem 0.4rem 0.625rem;
      border-radius: 99px;
    }

    .empresa-logo {
      width: 36px; height: 36px;
      object-fit: contain;
      border-radius: 6px;
      background: #fff;
      border: 1px solid var(--border);
      flex-shrink: 0;
    }

    .empresa-avatar {
      width: 36px; height: 36px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 1rem;
      flex-shrink: 0;
    }

    .empresa-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 6px var(--success);
      flex-shrink: 0;
    }

    .empresa-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      display: block;
      line-height: 1.2;
    }

    .empresa-cnpj {
      font-size: 0.7rem;
      color: var(--text-secondary);
      font-family: 'Space Mono', monospace;
      letter-spacing: 0.03em;
    }

    /* ── Right ── */
    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .header-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.875rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.18s;
      font-family: var(--font-body);
    }

    .header-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--accent);
    }

    .header-btn i { font-size: 0.85rem; }

    .theme-btn:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-glow);
    }

    .divider {
      width: 1px;
      height: 28px;
      background: var(--border);
      margin: 0 0.25rem;
    }

    /* ── User ── */
    .user-avatar-area {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3B82F6, #8B5CF6);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .user-role {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    .logout-btn {
      width: 34px; height: 34px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.18s;
      font-size: 0.9rem;
    }

    .logout-btn:hover {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.4);
      color: #EF4444;
    }
  `,
})
export class HeaderComponent {
  darkMode = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    public empresaService: EmpresaService,
    private router: Router,
  ) {
    const saved = localStorage.getItem('bpo-theme');
    if (saved === 'dark') {
      this.darkMode.set(true);
      document.documentElement.classList.add('dark-mode');
    }
  }

  initials(): string {
    const nome = this.authService.usuario()?.nome ?? '';
    return nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  }

  toggleTheme() {
    const isDark = !this.darkMode();
    this.darkMode.set(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('bpo-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('bpo-theme', 'light');
    }
  }

  trocarEmpresa() {
    this.router.navigate(['/selecionar-empresa']);
  }

  logout() {
    this.authService.logout();
  }
}
