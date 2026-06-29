import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MenuModule],
  template: `
    <div class="sidebar">
      <div class="logo">
        <h3>BPO Financeiro</h3>
      </div>

      <nav class="nav-menu">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
          <i class="pi pi-home"></i>
          <span>Dashboard</span>
        </a>

        @if (authService.isAdmin()) {
          <a routerLink="/empresas" routerLinkActive="active" class="nav-item">
            <i class="pi pi-building"></i>
            <span>Empresas</span>
          </a>

          <a routerLink="/usuarios" routerLinkActive="active" class="nav-item">
            <i class="pi pi-users"></i>
            <span>Usuários</span>
          </a>
        }

        <a routerLink="/dre" routerLinkActive="active" class="nav-item">
          <i class="pi pi-chart-bar"></i>
          <span>DRE</span>
        </a>

        <a routerLink="/lancamentos" routerLinkActive="active" class="nav-item">
          <i class="pi pi-dollar"></i>
          <span>Lançamentos</span>
        </a>

        <a routerLink="/contas-bancarias" routerLinkActive="active" class="nav-item">
          <i class="pi pi-wallet"></i>
          <span>Contas Bancárias</span>
        </a>

        <a routerLink="/plano-contas" routerLinkActive="active" class="nav-item">
          <i class="pi pi-list"></i>
          <span>Plano de Contas</span>
        </a>
      </nav>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 250px;
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
    }

    .sidebar {
      width: 250px;
      height: 100vh;
      background: var(--surface-card);
      border-right: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
    }

    .logo {
      padding: 1.5rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .logo h3 {
      margin: 0;
      color: var(--primary-color);
    }

    .nav-menu {
      padding: 1rem 0;
      display: flex;
      flex-direction: column;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      color: var(--text-color);
      text-decoration: none;
      transition: background 0.2s;
    }

    .nav-item:hover {
      background: var(--surface-hover);
    }

    .nav-item.active {
      background: var(--primary-color);
      color: var(--primary-color-text);
    }

    .nav-item i {
      font-size: 1.1rem;
    }
  `,
})
export class SidebarComponent {
  constructor(public authService: AuthService) {}
}
