import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { EmpresaService } from '../../core/services/empresa.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <h2>Dashboard</h2>

    @if (empresaService.empresaAtiva(); as empresa) {
      <p>Empresa ativa: <strong>{{ empresa.nome_fantasia || empresa.razao_social }}</strong></p>
    }

    <div class="dashboard-grid">
      <p-card header="Saldo das Contas">
        <p class="placeholder">Disponível na Fase 2</p>
      </p-card>
      <p-card header="Fluxo de Caixa">
        <p class="placeholder">Disponível na Fase 2</p>
      </p-card>
      <p-card header="Contas a Pagar">
        <p class="placeholder">Disponível na Fase 2</p>
      </p-card>
      <p-card header="Contas a Receber">
        <p class="placeholder">Disponível na Fase 2</p>
      </p-card>
      <p-card header="DRE do Mês">
        <p class="placeholder">Disponível na Fase 3</p>
      </p-card>
      <p-card header="Lucro Líquido">
        <p class="placeholder">Disponível na Fase 3</p>
      </p-card>
    </div>
  `,
  styles: `
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .placeholder {
      color: var(--text-color-secondary);
      font-style: italic;
    }
  `,
})
export class DashboardComponent {
  constructor(
    public empresaService: EmpresaService,
    public authService: AuthService,
  ) {}
}
