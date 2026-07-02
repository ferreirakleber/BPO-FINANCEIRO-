import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmpresaService } from '../../../core/services/empresa.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <!-- Logo -->
      <div class="logo-area">
        <div class="logo-icon">
          <i class="pi pi-chart-line"></i>
        </div>
        <div class="logo-text">
          <span class="logo-name">BPO</span>
          <span class="logo-sub">Financeiro</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="nav">
        <div class="nav-group">
          <span class="nav-label">Principal</span>
          <a routerLink="/" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
            <span class="nav-icon"><i class="pi pi-home"></i></span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/dre" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="pi pi-chart-bar"></i></span>
            <span>DRE</span>
          </a>
          <a routerLink="/lancamentos" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="pi pi-dollar"></i></span>
            <span>Lançamentos</span>
          </a>
          <a routerLink="/calendario" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="pi pi-calendar"></i></span>
            <span>Calendário</span>
          </a>
        </div>

        <div class="nav-group">
          <span class="nav-label">Operações</span>
          <a routerLink="/importacao" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="pi pi-file-excel"></i></span>
            <span>Importar Extratos</span>
          </a>
          <a routerLink="/integracoes" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="pi pi-link"></i></span>
            <span>Integrações</span>
          </a>
          <a routerLink="/contas-bancarias" routerLinkActive="active" class="nav-item">
            <span class="nav-icon"><i class="pi pi-wallet"></i></span>
            <span>Contas Bancárias</span>
          </a>
        </div>

        @if (authService.isAdmin()) {
          <div class="nav-group">
            <span class="nav-label">Administração</span>
            <a routerLink="/empresas" routerLinkActive="active" class="nav-item">
              <span class="nav-icon"><i class="pi pi-building"></i></span>
              <span>Empresas</span>
            </a>
            <a routerLink="/usuarios" routerLinkActive="active" class="nav-item">
              <span class="nav-icon"><i class="pi pi-users"></i></span>
              <span>Usuários</span>
            </a>
          </div>
        }
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="version-badge">v1.0 · BPO Suite</div>
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: block;
      width: var(--sidebar-w, 260px);
      height: 100vh;
      position: fixed;
      left: 0; top: 0;
      z-index: 200;
    }

    .sidebar {
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #0F172A 0%, #0D1B35 60%, #0A1628 100%);
      display: flex;
      flex-direction: column;
      border-right: 1px solid rgba(255,255,255,0.06);
      overflow: hidden;
    }

    /* Subtle texture overlay */
    .sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='rgba(255,255,255,0.015)'/%3E%3C/svg%3E") repeat;
      pointer-events: none;
    }

    /* ── Logo ── */
    .logo-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem 1.25rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    .logo-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--empresa-cor, #3B82F6), var(--empresa-cor-dark, #2563EB));
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px color-mix(in srgb, var(--empresa-cor, #3B82F6) 40%, transparent);
      flex-shrink: 0;
      transition: background 0.4s;
    }

    .logo-icon i {
      color: #fff;
      font-size: 1.1rem;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .logo-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: #F1F5F9;
      letter-spacing: -0.02em;
    }

    .logo-sub {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* ── Nav ── */
    .nav {
      flex: 1;
      padding: 1rem 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-group {
      margin-bottom: 0.5rem;
    }

    .nav-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.25);
      padding: 0.75rem 1.25rem 0.25rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1.25rem;
      margin: 0 0.5rem;
      border-radius: 8px;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.18s ease;
      position: relative;
    }

    .nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.9);
    }

    .nav-item.active {
      background: var(--empresa-cor-light, rgba(59,130,246,0.15));
      color: #93C5FD;
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: -0.5rem;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: var(--empresa-cor, #3B82F6);
      border-radius: 99px;
      box-shadow: 0 0 8px var(--empresa-cor, rgba(59,130,246,0.8));
    }

    .nav-icon {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 7px;
      background: rgba(255,255,255,0.06);
      flex-shrink: 0;
      transition: background 0.18s;
    }

    .nav-item:hover .nav-icon {
      background: rgba(255,255,255,0.1);
    }

    .nav-item.active .nav-icon {
      background: var(--empresa-cor-light, rgba(59,130,246,0.2));
    }

    .nav-icon i {
      font-size: 0.9rem;
    }

    /* ── Footer ── */
    .sidebar-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .version-badge {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.2);
      font-weight: 500;
      letter-spacing: 0.05em;
    }
  `,
})
export class SidebarComponent {
  constructor(public authService: AuthService, public empresaService: EmpresaService) {}
}
