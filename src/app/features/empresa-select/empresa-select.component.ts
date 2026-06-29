import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { EmpresaService } from '../../core/services/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { Empresa } from '../../core/models/empresa.model';
import { CnpjPipe } from '../../shared/pipes/cnpj.pipe';

@Component({
  selector: 'app-empresa-select',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, CnpjPipe],
  template: `
    <div class="select-container">
      <div class="select-content">
        <h2>Selecione a Empresa</h2>
        <p>Escolha a empresa que deseja acessar</p>

        <div class="empresa-grid">
          @for (empresa of empresaService.empresas(); track empresa.id) {
            <p-card
              styleClass="empresa-card"
              (click)="selectEmpresa(empresa)"
            >
              <div class="empresa-info">
                <h3>{{ empresa.nome_fantasia || empresa.razao_social }}</h3>
                <p>{{ empresa.cnpj | cnpj }}</p>
                <small>{{ empresa.razao_social }}</small>
              </div>
            </p-card>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .select-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--surface-ground);
    }

    .select-content {
      text-align: center;
      max-width: 800px;
      width: 100%;
      padding: 2rem;
    }

    .select-content h2 {
      color: var(--primary-color);
    }

    .empresa-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }

    :host ::ng-deep .empresa-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    :host ::ng-deep .empresa-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .empresa-info h3 {
      margin: 0 0 0.5rem;
    }

    .empresa-info p {
      margin: 0;
      color: var(--text-color-secondary);
      font-family: monospace;
    }

    .empresa-info small {
      color: var(--text-color-secondary);
    }
  `,
})
export class EmpresaSelectComponent implements OnInit {
  constructor(
    public empresaService: EmpresaService,
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit() {
    if (this.empresaService.empresas().length === 0) {
      await this.empresaService.loadEmpresas();
    }
  }

  selectEmpresa(empresa: Empresa) {
    this.empresaService.setEmpresaAtiva(empresa);
    this.router.navigate(['/']);
  }
}
