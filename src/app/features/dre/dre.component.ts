import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TabViewModule } from 'primeng/tabview';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DreService } from '../../core/services/dre.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { DreData, DreLinha } from '../../core/models/dre.model';

@Component({
  selector: 'app-dre',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DropdownModule,
    CalendarModule, TabViewModule, CardModule, ChartModule, TagModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="page-header">
      <h2>DRE - Demonstração do Resultado</h2>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <p-dropdown
        [(ngModel)]="periodoSelecionado"
        [options]="periodosOptions"
        optionLabel="label"
        optionValue="value"
        (onChange)="onPeriodoChange()"
        styleClass="w-12rem"
      />
      <p-dropdown
        [(ngModel)]="mesSelecionado"
        [options]="mesesOptions"
        optionLabel="label"
        optionValue="value"
        (onChange)="loadDre()"
        styleClass="w-10rem"
      />
      <p-dropdown
        [(ngModel)]="anoSelecionado"
        [options]="anosOptions"
        optionLabel="label"
        optionValue="value"
        (onChange)="loadDre()"
        styleClass="w-8rem"
      />

      @if (authService.isAdmin()) {
        <p-dropdown
          [(ngModel)]="visualizacao"
          [options]="visualizacaoOptions"
          optionLabel="label"
          optionValue="value"
          (onChange)="loadDre()"
          styleClass="w-12rem"
        />
      }
    </div>

    <p-tabView>
      <!-- Tab DRE -->
      <p-tabPanel header="DRE">
        @if (dreService.dreData(); as dre) {
          <div class="dre-header">
            <h3>{{ dre.empresa_nome }}</h3>
            <span>Período: {{ dre.periodo }}</span>
          </div>

          <table class="dre-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th class="text-right">Valor (R$)</th>
                <th class="text-right">% Receita</th>
              </tr>
            </thead>
            <tbody>
              @for (linha of dre.linhas; track linha.label) {
                <tr [class]="getLinhaClass(linha)">
                  <td [class]="linha.children ? 'bold' : ''">{{ linha.label }}</td>
                  <td class="text-right" [class]="getValorClass(linha)">
                    {{ linha.valor | currency:'BRL' }}
                  </td>
                  <td class="text-right">{{ linha.percentual | number:'1.1-1' }}%</td>
                </tr>
                @if (linha.children && expandedGroups[linha.label]) {
                  @for (child of linha.children; track child.label) {
                    <tr class="child-row">
                      <td class="indent">{{ child.label }}</td>
                      <td class="text-right">{{ child.valor | currency:'BRL' }}</td>
                      <td class="text-right">{{ child.percentual | number:'1.1-1' }}%</td>
                    </tr>
                  }
                }
                @if (linha.children) {
                  <tr class="toggle-row">
                    <td colspan="3">
                      <button class="toggle-btn" (click)="toggleGroup(linha.label)">
                        <i [class]="expandedGroups[linha.label] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
                        {{ expandedGroups[linha.label] ? 'Recolher' : 'Expandir detalhes' }}
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <p style="text-align: center; padding: 2rem; color: var(--text-color-secondary)">
            Selecione o período para visualizar a DRE
          </p>
        }
      </p-tabPanel>

      <!-- Tab Gráfico -->
      <p-tabPanel header="Gráfico">
        @if (chartData()) {
          <p-chart type="bar" [data]="chartData()!" [options]="chartOptions" height="400px" />
        }
      </p-tabPanel>

      <!-- Tab Comparativo -->
      @if (authService.isAdmin() && dreService.dreComparativo().length > 0) {
        <p-tabPanel header="Comparativo por Empresa">
          <table class="dre-table comparativo">
            <thead>
              <tr>
                <th>Indicador</th>
                @for (dre of dreService.dreComparativo(); track dre.empresa_id) {
                  <th class="text-right">{{ dre.empresa_nome }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (indicador of indicadoresComparativo; track indicador.key) {
                <tr [class]="indicador.isResult ? 'result-row' : ''">
                  <td [class]="indicador.isResult ? 'bold' : ''">{{ indicador.label }}</td>
                  @for (dre of dreService.dreComparativo(); track dre.empresa_id) {
                    <td class="text-right" [class]="getComparativoClass(dre, indicador.key)">
                      {{ getComparativoValue(dre, indicador.key) | currency:'BRL' }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </p-tabPanel>
      }
    </p-tabView>

    <p-toast />
  `,
  styles: `
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; }
    .filters { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }

    .dre-header { margin-bottom: 1rem; }
    .dre-header h3 { margin: 0; }
    .dre-header span { color: var(--text-color-secondary); }

    .dre-table { width: 100%; border-collapse: collapse; }
    .dre-table th, .dre-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border); }
    .dre-table th { background: var(--surface-100); font-weight: 600; text-align: left; }
    .dre-table .text-right { text-align: right; }
    .dre-table .bold { font-weight: 700; }
    .dre-table .indent { padding-left: 2.5rem; }

    .result-row { background: var(--surface-50); }
    .result-row td { font-weight: 700; }

    .child-row { background: var(--surface-0); }
    .child-row td { font-size: 0.9rem; color: var(--text-color-secondary); }

    .toggle-row td { padding: 0.25rem 1rem; border-bottom: none; }
    .toggle-btn {
      background: none; border: none; color: var(--primary-color);
      cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem;
    }

    .valor-positivo { color: #22c55e; }
    .valor-negativo { color: #ef4444; }

    .comparativo th { min-width: 150px; }
  `,
})
export class DreComponent implements OnInit {
  expandedGroups: Record<string, boolean> = {};

  periodoSelecionado = 'mensal';
  mesSelecionado = new Date().getMonth() + 1;
  anoSelecionado = new Date().getFullYear();
  visualizacao = 'empresa';

  periodosOptions = [
    { label: 'Mensal', value: 'mensal' },
    { label: 'Trimestral', value: 'trimestral' },
    { label: 'Anual', value: 'anual' },
  ];

  mesesOptions = [
    { label: 'Janeiro', value: 1 }, { label: 'Fevereiro', value: 2 },
    { label: 'Março', value: 3 }, { label: 'Abril', value: 4 },
    { label: 'Maio', value: 5 }, { label: 'Junho', value: 6 },
    { label: 'Julho', value: 7 }, { label: 'Agosto', value: 8 },
    { label: 'Setembro', value: 9 }, { label: 'Outubro', value: 10 },
    { label: 'Novembro', value: 11 }, { label: 'Dezembro', value: 12 },
  ];

  anosOptions = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { label: y.toString(), value: y };
  });

  visualizacaoOptions = [
    { label: 'Por Empresa', value: 'empresa' },
    { label: 'Consolidado', value: 'consolidado' },
  ];

  indicadoresComparativo = [
    { key: 'receita_bruta', label: 'Receita Bruta', isResult: false },
    { key: 'deducoes', label: '(-) Deduções', isResult: false },
    { key: 'receita_liquida', label: '= Receita Líquida', isResult: true },
    { key: 'custos', label: '(-) Custos', isResult: false },
    { key: 'lucro_bruto', label: '= Lucro Bruto', isResult: true },
    { key: 'total_despesas_operacionais', label: '(-) Despesas Operacionais', isResult: false },
    { key: 'resultado_operacional', label: '= Resultado Operacional', isResult: true },
    { key: 'lucro_antes_ir', label: '= Lucro Antes do IR', isResult: true },
    { key: 'ir_csll', label: '(-) IR / CSLL', isResult: false },
    { key: 'lucro_liquido', label: '= Lucro Líquido', isResult: true },
  ];

  chartData = computed(() => {
    const dre = this.dreService.dreData();
    if (!dre) return null;

    return {
      labels: ['Receita Bruta', 'Deduções', 'Custos', 'Desp. Operacionais', 'IR/CSLL', 'Lucro Líquido'],
      datasets: [{
        label: 'Valores (R$)',
        data: [
          dre.receita_bruta,
          -dre.deducoes,
          -dre.custos,
          -dre.total_despesas_operacionais,
          -dre.ir_csll,
          dre.lucro_liquido,
        ],
        backgroundColor: [
          '#22c55e', '#f59e0b', '#ef4444', '#ef4444', '#f59e0b',
          dre.lucro_liquido >= 0 ? '#22c55e' : '#ef4444',
        ],
      }],
    };
  });

  chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        ticks: {
          callback: (v: number) => `R$ ${v.toLocaleString('pt-BR')}`,
        },
      },
    },
  };

  constructor(
    public dreService: DreService,
    public empresaService: EmpresaService,
    public authService: AuthService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await this.loadDre();
  }

  onPeriodoChange() {
    this.loadDre();
  }

  async loadDre() {
    const { inicio, fim } = this.calcularPeriodo();

    if (this.visualizacao === 'consolidado') {
      await this.dreService.loadDreConsolidada(inicio, fim);
    } else {
      await this.dreService.loadDreEmpresa(inicio, fim);
    }
  }

  private calcularPeriodo(): { inicio: string; fim: string } {
    const ano = this.anoSelecionado;
    const mes = this.mesSelecionado;

    if (this.periodoSelecionado === 'anual') {
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
    }

    if (this.periodoSelecionado === 'trimestral') {
      const trimestre = Math.ceil(mes / 3);
      const mesInicio = (trimestre - 1) * 3 + 1;
      const mesFim = trimestre * 3;
      return {
        inicio: `${ano}-${String(mesInicio).padStart(2, '0')}-01`,
        fim: `${ano}-${String(mesFim).padStart(2, '0')}-${new Date(ano, mesFim, 0).getDate()}`,
      };
    }

    // mensal
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return {
      inicio: `${ano}-${String(mes).padStart(2, '0')}-01`,
      fim: `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`,
    };
  }

  toggleGroup(label: string) {
    this.expandedGroups[label] = !this.expandedGroups[label];
  }

  getLinhaClass(linha: DreLinha): string {
    if (linha.tipo === 'resultado') return 'result-row';
    return '';
  }

  getValorClass(linha: DreLinha): string {
    if (linha.tipo === 'resultado') {
      return linha.valor >= 0 ? 'valor-positivo bold' : 'valor-negativo bold';
    }
    return '';
  }

  getComparativoValue(dre: DreData, key: string): number {
    return (dre as any)[key] ?? 0;
  }

  getComparativoClass(dre: DreData, key: string): string {
    const val = (dre as any)[key] ?? 0;
    if (['lucro_bruto', 'receita_liquida', 'resultado_operacional', 'lucro_antes_ir', 'lucro_liquido'].includes(key)) {
      return val >= 0 ? 'valor-positivo' : 'valor-negativo';
    }
    return '';
  }
}
