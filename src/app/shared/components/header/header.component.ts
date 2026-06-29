import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { Empresa } from '../../../core/models/empresa.model';
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
  `,
})
export class HeaderComponent {
  constructor(
    public authService: AuthService,
    public empresaService: EmpresaService,
    private router: Router,
  ) {}

  trocarEmpresa() {
    this.router.navigate(['/selecionar-empresa']);
  }

  logout() {
    this.authService.logout();
  }
}
