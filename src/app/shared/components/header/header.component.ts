import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { CnpjPipe } from '../../pipes/cnpj.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ButtonModule, DropdownModule, FormsModule, CnpjPipe],
  template: `
    <div class="header">
      <div class="header-left">
        @if (empresaService.empresaAtiva(); as empresa) {
          <div class="empresa-badge">
            <i class="pi pi-building"></i>
            <span>{{ empresa.nome_fantasia || empresa.razao_social }}</span>
            <small>{{ empresa.cnpj | cnpj }}</small>
          </div>
        }
      </div>

      <div class="header-right">
        @if (empresaService.empresas().length > 1) {
          <p-button
            icon="pi pi-sync"
            label="Trocar Empresa"
            [text]="true"
            (onClick)="trocarEmpresa()"
          />
        }

        <!-- Botão Modo Escuro/Claro -->
        <button class="theme-toggle" (click)="toggleTheme()" [title]="darkMode() ? 'Mudar para modo claro' : 'Mudar para modo escuro'">
          <i [class]="darkMode() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          <span>{{ darkMode() ? 'Claro' : 'Escuro' }}</span>
        </button>

        <div class="user-info">
          <span>{{ authService.usuario()?.nome }}</span>
          <small>{{ authService.usuario()?.perfil }}</small>
        </div>

        <p-button
          icon="pi pi-sign-out"
          [rounded]="true"
          [text]="true"
          severity="danger"
          (onClick)="logout()"
        />
      </div>
    </div>
  `,
  styles: `
    .header {
      height: 60px;
      background: var(--surface-card);
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
    }

    .empresa-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--surface-ground);
      padding: 0.5rem 1rem;
      border-radius: 6px;
    }

    .empresa-badge small {
      color: var(--text-color-secondary);
      font-family: monospace;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .user-info span {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .user-info small {
      color: var(--text-color-secondary);
      font-size: 0.75rem;
      text-transform: capitalize;
    }

    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.9rem;
      border-radius: 20px;
      border: 1px solid var(--surface-border);
      background: var(--surface-ground);
      color: var(--text-color);
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background: var(--surface-hover);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .theme-toggle i {
      font-size: 0.95rem;
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
    // Restaurar preferência salva
    const saved = localStorage.getItem('bpo-theme');
    if (saved === 'dark') {
      this.darkMode.set(true);
      document.documentElement.classList.add('dark-mode');
    }
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
