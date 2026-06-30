import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService, MenuItem } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';
import { ChartModule } from 'primeng/chart';
import * as XLSX from 'xlsx';
import { EmpresaService } from '../../core/services/empresa.service';
import { PlanoContasService } from '../../core/services/plano-contas.service';
import { LancamentoService } from '../../core/services/lancamento.service';
import { DreService } from '../../core/services/dre.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { GrupoDre } from '../../core/models/plano-contas.model';
import { DreData } from '../../core/models/dre.model';

interface LinhaExtrato {
  dataVencimento: string;
  dataCompetencia: string;
  descricao: string;
  valor: number;
  valorPago: number;
  valorAberto: number;
  situacao: string;
  categoria: string;
  contaBancaria: string;
  formaPagamento: string;
  notaFiscal: string;
  observacoes: string;
  recorrencia: string;
  grupoDre: GrupoDre;
  tipoDetectado: 'receita' | 'despesa';
  arquivoOrigem: string;
}

interface ArquivoImportado {
  nome: string;
  tipoDetectado: 'receita' | 'despesa' | 'misto';
  totalLinhas: number;
  totalValor: number;
  status: 'ok' | 'erro';
  erro?: string;
}

const CATEGORIA_DRE_MAP: Record<string, GrupoDre> = {
  'receita': 'receita_bruta', 'faturamento': 'receita_bruta', 'vendas': 'receita_bruta',
  'mensalidade': 'receita_bruta', 'mensalidades': 'receita_bruta', 'adesao': 'receita_bruta',
  'adesão': 'receita_bruta', 'personal': 'receita_bruta', 'diaria': 'receita_bruta',
  'avaliação': 'receita_bruta', 'avaliacao': 'receita_bruta', 'boutique': 'receita_bruta',
  'suplemento': 'receita_bruta', 'produto': 'receita_bruta', 'serviço': 'receita_bruta',
  'imposto': 'deducoes', 'impostos': 'deducoes',
  'custo': 'custos', 'cmv': 'custos', 'csp': 'custos',
  'administrativ': 'desp_admin', 'aluguel': 'desp_admin', 'locação': 'desp_admin',
  'limpeza': 'desp_admin', 'manutenção': 'desp_admin', 'manutencao': 'desp_admin',
  'escritorio': 'desp_admin', 'escritório': 'desp_admin',
  'comercial': 'desp_comercial', 'comissao': 'desp_comercial', 'comissão': 'desp_comercial',
  'financeiro': 'desp_financeira', 'financeira': 'desp_financeira', 'juros': 'desp_financeira',
  'tarifa': 'desp_financeira', 'banco': 'desp_financeira', 'iof': 'desp_financeira',
  'tribut': 'desp_tributaria', 'das ': 'desp_tributaria', 'simples': 'desp_tributaria',
  'inss': 'desp_tributaria', 'fgts': 'desp_tributaria', 'irrf': 'desp_tributaria',
  'pessoal': 'desp_pessoal', 'salario': 'desp_pessoal', 'salário': 'desp_pessoal',
  'folha': 'desp_pessoal', 'prolabore': 'desp_pessoal', 'pró-labore': 'desp_pessoal',
  'vale': 'desp_pessoal', 'beneficio': 'desp_pessoal', 'benefício': 'desp_pessoal',
  'reembolso': 'desp_pessoal', 'viagem': 'desp_pessoal',
  'marketing': 'desp_marketing', 'publicidade': 'desp_marketing', 'propaganda': 'desp_marketing',
  'sistema': 'desp_operacional', 'software': 'desp_operacional', 'licença': 'desp_operacional',
  'internet': 'desp_operacional', 'telefone': 'desp_operacional', 'telecom': 'desp_operacional',
  'seguro': 'desp_operacional', 'contabil': 'desp_operacional', 'contábil': 'desp_operacional',
  'depreciacao': 'depreciacao_amortizacao', 'depreciação': 'depreciacao_amortizacao',
  'amortizacao': 'depreciacao_amortizacao', 'amortização': 'depreciacao_amortizacao',
  'ir ': 'ir_csll', 'csll': 'ir_csll', 'irpj': 'ir_csll',
};

@Component({
  selector: 'app-importacao',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, DropdownModule,
    TableModule, TagModule, StepsModule, ToastModule, TabViewModule, ChartModule, DialogModule,
  ],
  providers: [MessageService],
  template: `
    <div class="page-header">
      <h2>Importar Extratos Financeiros</h2>
    </div>

    <p-steps [model]="steps" [activeIndex]="activeStep()" [readonly]="true" styleClass="mb-steps" />

    <!-- Step 1: Upload múltiplos arquivos -->
    @if (activeStep() === 0) {
      <p-card header="1. Selecione os arquivos e a empresa">
        <div class="upload-area">
          <div class="field">
            <label>Empresa destino</label>
            <p-dropdown
              [(ngModel)]="empresaSelecionadaId"
              [options]="empresaOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecione a empresa"
              styleClass="w-full"
            />
          </div>

          <div class="field">
            <label>Arquivos Excel (.xlsx, .xls) ou CSV — selecione quantos quiser</label>
            <div class="file-drop" (click)="fileInput.click()">
              <i class="pi pi-cloud-upload" style="font-size: 2.5rem; color: var(--primary-color)"></i>
              <p>Clique para selecionar os arquivos</p>
              <small>Você pode selecionar múltiplos arquivos de uma vez (Ctrl+Click)</small>
              <small style="display:block; margin-top:0.25rem; color: var(--primary-color)">
                Formatos aceitos: Extrato Financeiro, Análise de Recebimentos, Visão Contas a Pagar
              </small>
            </div>
            <input #fileInput type="file" accept=".xlsx,.xls,.csv" multiple (change)="onFilesSelect($event)" style="display: none" />
          </div>

          <!-- Lista de arquivos carregados -->
          @if (arquivosCarregados().length > 0) {
            <div class="arquivos-list">
              <h4 style="margin: 0 0 0.75rem">Arquivos selecionados ({{ arquivosCarregados().length }})</h4>
              @for (arq of arquivosCarregados(); track arq.nome) {
                <div class="arquivo-item">
                  <div class="arquivo-info">
                    <i class="pi pi-file-excel" style="color: #22c55e; font-size: 1.2rem"></i>
                    <div>
                      <div class="arquivo-nome">{{ arq.nome }}</div>
                      <div class="arquivo-meta">
                        <p-tag
                          [value]="arq.tipoDetectado === 'receita' ? 'Receitas' : arq.tipoDetectado === 'despesa' ? 'Despesas' : 'Misto'"
                          [severity]="arq.tipoDetectado === 'receita' ? 'success' : arq.tipoDetectado === 'despesa' ? 'danger' : 'warn'"
                        />
                        <span class="arquivo-qtd">{{ arq.totalLinhas }} lançamentos</span>
                        <span class="arquivo-valor">{{ arq.totalValor | currency:'BRL' }}</span>
                      </div>
                    </div>
                  </div>
                  <p-button icon="pi pi-times" severity="danger" [text]="true" size="small" (onClick)="removerArquivo(arq.nome)" />
                </div>
              }

              <div class="resumo-total">
                <span>Total: <strong>{{ totalLinhas() }} lançamentos</strong></span>
                <span>Receitas: <strong class="val-pos">{{ totalReceitas() | currency:'BRL' }}</strong></span>
                <span>Despesas: <strong class="val-neg">{{ totalDespesas() | currency:'BRL' }}</strong></span>
              </div>
            </div>
          }
        </div>

        <div style="text-align: right; margin-top: 1rem">
          <p-button label="Próximo" icon="pi pi-arrow-right" (onClick)="nextStep()" [disabled]="linhas().length === 0" />
        </div>
      </p-card>
    }

    <!-- Step 2: Revisão combinada -->
    @if (activeStep() === 1) {
      <p-card header="2. Revise os lançamentos">
        <div class="summary-bar">
          <div class="stat">
            <span>Total de lançamentos</span>
            <strong>{{ linhas().length }}</strong>
          </div>
          <div class="stat receita">
            <span>Receitas</span>
            <strong>{{ totalReceitas() | currency:'BRL' }}</strong>
          </div>
          <div class="stat despesa">
            <span>Despesas</span>
            <strong>{{ totalDespesas() | currency:'BRL' }}</strong>
          </div>
          <div class="stat aberto">
            <span>Em Aberto</span>
            <strong>{{ qtdAberto() }} | {{ totalAberto() | currency:'BRL' }}</strong>
          </div>
          <div class="stat pago">
            <span>Pagos/Recebidos</span>
            <strong>{{ qtdPago() }}</strong>
          </div>
        </div>

        <p-table
          [value]="linhas()"
          [paginator]="true"
          [rows]="20"
          [rowHover]="true"
          styleClass="p-datatable-sm p-datatable-striped"
          [scrollable]="true"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 100px">Vencimento</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th style="width: 80px">Tipo</th>
              <th style="width: 100px">Situação</th>
              <th style="text-align: right; width: 120px">Valor</th>
              <th style="width: 180px">Grupo DRE</th>
              <th style="width: 120px">Arquivo</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-linha>
            <tr>
              <td>{{ linha.dataVencimento }}</td>
              <td>{{ linha.descricao }}</td>
              <td><small>{{ linha.categoria }}</small></td>
              <td>
                <p-tag
                  [value]="linha.tipoDetectado === 'receita' ? 'Receita' : 'Despesa'"
                  [severity]="linha.tipoDetectado === 'receita' ? 'success' : 'danger'"
                />
              </td>
              <td>
                <p-tag
                  [value]="linha.situacao"
                  [severity]="linha.situacao === 'Em aberto' ? 'warn' : 'success'"
                />
              </td>
              <td style="text-align: right" [class]="linha.tipoDetectado === 'receita' ? 'valor-pos' : 'valor-neg'">
                {{ linha.valor | currency:'BRL' }}
              </td>
              <td>
                <p-dropdown
                  [(ngModel)]="linha.grupoDre"
                  [options]="grupoDreOptions"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="w-full"
                />
              </td>
              <td><small class="text-muted">{{ linha.arquivoOrigem }}</small></td>
            </tr>
          </ng-template>
        </p-table>

        <div style="display: flex; justify-content: space-between; margin-top: 1rem">
          <p-button label="Voltar" icon="pi pi-arrow-left" severity="secondary" (onClick)="prevStep()" />
          <p-button label="Importar e Gerar DRE" icon="pi pi-check" (onClick)="executarImportacao()" [loading]="importing()" />
        </div>
      </p-card>
    }

    <!-- Step 3: DRE resultado -->
    @if (activeStep() === 2) {
      <p-card>
        <div class="result-header">
          <h3>DRE — {{ empresaSelecionadaNome() }}</h3>
          <div class="result-actions">
            <p-button icon="pi pi-whatsapp" label="Enviar via WhatsApp" severity="success" (onClick)="compartilharDreWhatsApp()" />
            <p-button label="Nova Importação" icon="pi pi-refresh" severity="secondary" (onClick)="reset()" />
          </div>
        </div>

        <div class="import-result">
          <p-tag value="{{ lancamentosImportados() }} lançamentos importados com sucesso" severity="success" />
        </div>

        @if (dreResult()) {
          <p-tabView>
            <p-tabPanel header="DRE">
              <table class="dre-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th class="text-right">Valor (R$)</th>
                    <th class="text-right">% Receita</th>
                    <th class="text-right" style="width: 80px">Qtd</th>
                    <th style="width: 60px"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (linha of dreResult()!.linhas; track linha.label) {
                    <tr [class]="getRowClass(linha)" (click)="linha.detalhes?.length ? openDetalhes(linha) : null">
                      <td [class]="linha.tipo === 'resultado' || linha.tipo === 'ebitda' ? 'bold' : ''">{{ linha.label }}</td>
                      <td class="text-right" [class]="getValorClass(linha)">
                        @if (linha.destaque && linha.label.includes('Margem')) {
                          {{ linha.valor | number:'1.1-1' }}%
                        } @else {
                          {{ linha.valor | currency:'BRL' }}
                        }
                      </td>
                      <td class="text-right">{{ linha.percentual | number:'1.1-1' }}%</td>
                      <td class="text-right">{{ linha.detalhes?.length ?? '' }}</td>
                      <td>
                        @if (linha.detalhes?.length) {
                          <i class="pi pi-search" style="cursor: pointer; color: var(--primary-color)"></i>
                        }
                      </td>
                    </tr>
                    @if (linha.children) {
                      @for (child of linha.children; track child.label) {
                        @if (child.valor > 0) {
                          <tr class="child-row clickable-row" (click)="toggleExpand(child.label)">
                            <td style="padding-left: 2rem">
                              @if (child.detalhes?.length) {
                                <i [class]="expandedRows[child.label] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" style="margin-right: 0.5rem; font-size: 0.8rem"></i>
                              }
                              {{ child.label }}
                            </td>
                            <td class="text-right">{{ child.valor | currency:'BRL' }}</td>
                            <td class="text-right">{{ child.percentual | number:'1.1-1' }}%</td>
                            <td class="text-right">{{ child.detalhes?.length ?? '' }}</td>
                            <td>
                              @if (child.detalhes?.length) {
                                <i class="pi pi-search" style="cursor: pointer; color: var(--primary-color)" (click)="openDetalhes(child); $event.stopPropagation()"></i>
                              }
                            </td>
                          </tr>
                          @if (expandedRows[child.label] && child.detalhes?.length) {
                            @for (det of child.detalhes; track det.id) {
                              <tr class="detail-row">
                                <td style="padding-left: 3.5rem">
                                  <span class="det-desc">{{ det.descricao }}</span>
                                  @if (det.fornecedor_cliente) {
                                    <span class="det-fornecedor">{{ det.fornecedor_cliente }}</span>
                                  }
                                </td>
                                <td class="text-right det-valor">{{ det.valor | currency:'BRL' }}</td>
                                <td class="text-right det-data">{{ det.data_vencimento | date:'dd/MM' }}</td>
                                <td></td>
                                <td></td>
                              </tr>
                            }
                          }
                        }
                      }
                    }
                  }
                </tbody>
              </table>

              <p-dialog
                [(visible)]="detalhesVisible"
                [header]="detalhesLabel"
                [modal]="true"
                [style]="{ width: '800px' }"
              >
                <p-table
                  [value]="detalhesLancamentos"
                  [paginator]="true"
                  [rows]="15"
                  styleClass="p-datatable-sm p-datatable-striped"
                >
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th class="text-right">Valor</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-d>
                    <tr>
                      <td>{{ d.data_vencimento | date:'dd/MM/yyyy' }}</td>
                      <td>{{ d.descricao }}</td>
                      <td>{{ d.categoria }}</td>
                      <td class="text-right" style="font-weight: 600">{{ d.valor | currency:'BRL' }}</td>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="footer">
                    <tr>
                      <td colspan="3" class="bold">Total</td>
                      <td class="text-right bold">{{ detalhesTotal | currency:'BRL' }}</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-dialog>
            </p-tabPanel>
            <p-tabPanel header="Gráfico">
              @if (dreChartData()) {
                <p-chart type="bar" [data]="dreChartData()!" [options]="chartOptions" height="400px" />
              }
            </p-tabPanel>
          </p-tabView>
        }
      </p-card>
    }

    <p-toast />
  `,
  styles: `
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; }
    :host ::ng-deep .mb-steps { margin-bottom: 2rem; }

    .upload-area { max-width: 700px; }
    .field { margin-bottom: 1.5rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-weight: 600; }

    .file-drop {
      border: 2px dashed var(--surface-border); border-radius: 10px;
      padding: 2rem; text-align: center; cursor: pointer;
      transition: border-color 0.2s;
    }
    .file-drop:hover { border-color: var(--primary-color); }
    .file-drop p { margin: 0.5rem 0; }
    .file-drop small { color: var(--text-color-secondary); }

    .arquivos-list {
      background: var(--surface-ground); border-radius: 10px;
      padding: 1rem; margin-top: 1rem;
    }
    .arquivo-item {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--surface-card); border-radius: 8px;
      padding: 0.75rem 1rem; margin-bottom: 0.5rem; gap: 1rem;
    }
    .arquivo-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
    .arquivo-nome { font-weight: 600; font-size: 0.9rem; }
    .arquivo-meta { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; font-size: 0.85rem; }
    .arquivo-qtd { color: var(--text-color-secondary); }
    .arquivo-valor { font-weight: 600; color: #3b82f6; }

    .resumo-total {
      display: flex; gap: 2rem; margin-top: 0.75rem;
      padding-top: 0.75rem; border-top: 1px solid var(--surface-border);
      font-size: 0.9rem;
    }
    .val-pos { color: #22c55e; }
    .val-neg { color: #ef4444; }

    .summary-bar { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; padding: 0.75rem 1.25rem; border-radius: 8px; background: var(--surface-ground); }
    .stat span { font-size: 0.8rem; color: var(--text-color-secondary); }
    .stat strong { font-size: 1.1rem; }
    .stat.aberto strong { color: #f59e0b; }
    .stat.pago strong { color: #22c55e; }
    .stat.receita strong { color: #22c55e; }
    .stat.despesa strong { color: #ef4444; }

    .text-muted { color: var(--text-color-secondary); }
    .valor-pos { color: #22c55e; font-weight: 600; }
    .valor-neg { color: #ef4444; font-weight: 600; }

    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .result-header h3 { margin: 0; }
    .result-actions { display: flex; gap: 0.5rem; }
    .import-result { margin-bottom: 1.5rem; }

    .dre-table { width: 100%; border-collapse: collapse; }
    .dre-table th, .dre-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border); }
    .dre-table th { background: var(--surface-100); font-weight: 600; text-align: left; }
    .dre-table .text-right { text-align: right; }
    .dre-table .bold { font-weight: 700; }
    .result-row { background: var(--surface-50); }
    .result-row td { font-weight: 700; }
    .child-row td { font-size: 0.9rem; color: var(--text-color-secondary); }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover); }
    .detail-row { background: var(--surface-0); }
    .detail-row td { padding: 0.4rem 1rem; font-size: 0.85rem; border-bottom: 1px dashed var(--surface-200); }
    .det-desc { color: var(--text-color); }
    .det-fornecedor { color: var(--text-color-secondary); margin-left: 0.5rem; font-size: 0.8rem; }
    .det-fornecedor::before { content: '| '; }
    .det-valor { color: #ef4444; }
    .det-data { color: var(--text-color-secondary); }
    .ebitda-row { background: #eff6ff; }
    .ebitda-row td { font-weight: 700; color: #1e40af; }
    .destaque-row td { font-style: italic; font-size: 0.9rem; }
  `,
})
export class ImportacaoComponent implements OnInit {
  activeStep = signal(0);
  linhas = signal<LinhaExtrato[]>([]);
  arquivosCarregados = signal<ArquivoImportado[]>([]);
  importing = signal(false);
  dreResult = signal<DreData | null>(null);
  lancamentosImportados = signal(0);
  empresaSelecionadaId: string | null = null;
  expandedRows: Record<string, boolean> = {};
  detalhesVisible = false;
  detalhesLabel = '';
  detalhesLancamentos: any[] = [];
  detalhesTotal = 0;

  steps: MenuItem[] = [
    { label: 'Upload' },
    { label: 'Revisão' },
    { label: 'DRE' },
  ];

  grupoDreOptions = [
    { label: 'Receita Bruta', value: 'receita_bruta' },
    { label: 'Deduções', value: 'deducoes' },
    { label: 'Custos', value: 'custos' },
    { label: 'Desp. Administrativas', value: 'desp_admin' },
    { label: 'Desp. Comerciais', value: 'desp_comercial' },
    { label: 'Desp. Financeiras', value: 'desp_financeira' },
    { label: 'Desp. Tributárias', value: 'desp_tributaria' },
    { label: 'Desp. Pessoal', value: 'desp_pessoal' },
    { label: 'Desp. Marketing', value: 'desp_marketing' },
    { label: 'Desp. Operacionais', value: 'desp_operacional' },
    { label: 'Depreciação/Amortização', value: 'depreciacao_amortizacao' },
    { label: 'Outras Receitas/Despesas', value: 'outras_receitas_despesas' },
    { label: 'IR / CSLL', value: 'ir_csll' },
  ];

  empresaOptions = signal<{ label: string; value: string }[]>([]);

  chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
  };

  canAdvanceStep1 = computed(() =>
    !!this.empresaSelecionadaId && this.linhas().length > 0
  );

  totalLinhas = computed(() => this.linhas().length);
  qtdAberto = computed(() => this.linhas().filter((l) => l.situacao === 'Em aberto').length);
  qtdPago = computed(() => this.linhas().filter((l) => l.situacao !== 'Em aberto').length);
  totalAberto = computed(() => this.linhas().filter((l) => l.situacao === 'Em aberto').reduce((s, l) => s + l.valorAberto, 0));
  totalReceitas = computed(() => this.linhas().filter((l) => l.tipoDetectado === 'receita').reduce((s, l) => s + l.valor, 0));
  totalDespesas = computed(() => this.linhas().filter((l) => l.tipoDetectado === 'despesa').reduce((s, l) => s + l.valor, 0));

  empresaSelecionadaNome = computed(() => {
    const emp = this.empresaService.empresas().find((e) => e.id === this.empresaSelecionadaId);
    return emp?.nome_fantasia || emp?.razao_social || '';
  });

  dreChartData = computed(() => {
    const dre = this.dreResult();
    if (!dre) return null;
    return {
      labels: ['Receita Bruta', 'Deduções', 'Custos', 'Desp. Operacionais', 'IR/CSLL', 'Lucro Líquido'],
      datasets: [{
        label: 'Valores (R$)',
        data: [dre.receita_bruta, -dre.deducoes, -dre.custos, -dre.total_despesas_operacionais, -dre.ir_csll, dre.lucro_liquido],
        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444', '#ef4444', '#f59e0b', dre.lucro_liquido >= 0 ? '#22c55e' : '#ef4444'],
      }],
    };
  });

  constructor(
    public empresaService: EmpresaService,
    private planoContasService: PlanoContasService,
    private lancamentoService: LancamentoService,
    private dreService: DreService,
    private supabaseService: SupabaseService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await this.empresaService.loadEmpresas();
    this.empresaOptions.set(
      this.empresaService.empresas().map((e) => ({
        label: e.nome_fantasia || e.razao_social,
        value: e.id,
      })),
    );
    this.empresaSelecionadaId = this.empresaService.empresaAtivaId();
  }

  onFilesSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      this.processarArquivo(file);
    }

    // Limpar input para permitir re-selecionar os mesmos arquivos
    input.value = '';
  }

  private processarArquivo(file: File) {
    const ext = file.name.toLowerCase().split('.').pop();

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        this.processarTexto(text, file.name);
      };
      reader.readAsText(file, 'ISO-8859-1');
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(sheet, { raw: false });
        this.processarLinhas(json, file.name);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  private processarTexto(text: string, nomeArquivo: string) {
    const firstLine = text.split('\n')[0];
    const sep = firstLine.includes(';') ? ';' : ',';
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return;

    const headers = lines[0].split(sep).map((h) => h.trim().replace(/"/g, ''));
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.trim().replace(/"/g, ''));
      if (cols.every((c) => !c)) continue;
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
      rows.push(row);
    }

    this.processarLinhas(rows, nomeArquivo);
  }

  private processarLinhas(rows: any[], nomeArquivo: string) {
    if (rows.length === 0) return;

    const keys = Object.keys(rows[0]);
    const has = (hint: string) => keys.some((k) => k.toLowerCase().includes(hint));

    const isExtrato = has('data movimento') || has('saldo conta');
    const isAnaliseRecebimentos = has('centro de custo') || (has('categoria') && has('valor total'));
    // Arquivo de pagamentos/despesas quando tem "data de vencimento"
    const isContasPagar = !isAnaliseRecebimentos && (has('data de vencimento') || has('parcela em aberto'));

    const novasLinhas: LinhaExtrato[] = [];

    for (const row of rows) {
      let dataVenc = '';
      let dataComp = '';
      let descricao = '';
      let valor = 0;
      let valorPago = 0;
      let valorAberto = 0;
      let situacao = '';
      let categoria = '';
      let contaBancaria = '';
      let formaPagamento = '';
      let notaFiscal = '';
      let observacoes = '';
      let recorrencia = '';
      let tipoDetectado: 'receita' | 'despesa' = 'despesa';

      if (isAnaliseRecebimentos) {
        const mesCol = keys.find((k) => /^[a-zç]+\.?\/\d{2}$/i.test(k.trim())) ?? keys[keys.length - 1];
        descricao = row['Categoria'] ?? row['categoria'] ?? '';
        categoria = row['Centro de custo'] ?? row['centro de custo'] ?? '';
        valor = this.parseValor(row[mesCol] ?? row['Valor total'] ?? row['valor total'] ?? '0');
        valorPago = valor;
        valorAberto = 0;

        // Detectar tipo pelo nome do arquivo e pelas categorias
        const nomeLower = nomeArquivo.toLowerCase();
        const isPagamento = nomeLower.includes('pagamento') || nomeLower.includes('pagar') || nomeLower.includes('despesa');
        const isRecebimento = nomeLower.includes('recebimento') || nomeLower.includes('receber') || nomeLower.includes('receita');
        if (isPagamento) {
          tipoDetectado = 'despesa';
          situacao = 'Pago';
        } else if (isRecebimento) {
          tipoDetectado = 'receita';
          situacao = 'Recebido';
        } else {
          // Fallback: verificar pelo nome da categoria
          const grupoCat = this.detectGrupoDre(descricao, '');
          tipoDetectado = grupoCat === 'receita_bruta' ? 'receita' : 'despesa';
          situacao = tipoDetectado === 'receita' ? 'Recebido' : 'Pago';
        }

        const meses: Record<string, string> = {
          jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
          jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
        };
        const mesMatch = mesCol.match(/^([a-z]{3})\.?\/(\d{2})$/i);
        if (mesMatch) {
          const mes = meses[mesMatch[1].toLowerCase()] ?? '01';
          const ano = `20${mesMatch[2]}`;
          const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
          dataVenc = `${String(ultimoDia).padStart(2, '0')}/${mes}/${ano}`;
          dataComp = dataVenc;
        } else {
          dataVenc = new Date().toLocaleDateString('pt-BR');
          dataComp = dataVenc;
        }
      } else if (isExtrato) {
        dataVenc = row['Data movimento'] ?? row['Data original de vencimento'] ?? '';
        dataComp = row['Data de competência'] ?? '';
        descricao = row['Descrição'] ?? '';
        valor = this.parseValor(row['Valor (R$)'] ?? row['Valor original (R$)'] ?? '0');
        const sitStr = (row['Situação'] ?? '').toLowerCase();
        valorPago = sitStr.includes('conciliado') || sitStr.includes('pago') ? valor : 0;
        valorAberto = valorPago > 0 ? 0 : valor;
        situacao = row['Situação'] ?? 'Em aberto';
        const tipoRow = (row['Tipo'] ?? '').toLowerCase();
        tipoDetectado = tipoRow === 'receita' ? 'receita' : 'despesa';
        categoria = row['Categoria 1'] ?? '';
        contaBancaria = row['Conta bancária'] ?? '';
        formaPagamento = row['Forma de pgto/recbto'] ?? '';
        notaFiscal = row['Nota fiscal'] ?? '';
        observacoes = row['Observações'] ?? '';
        recorrencia = row['Recorrência'] ?? '';
      } else {
        // Visão Contas a Pagar — sempre despesa
        dataVenc = row['Data de vencimento'] ?? row['Data vencimento'] ?? '';
        dataComp = row['Data de competência'] ?? row['Data competência'] ?? '';
        descricao = row['Descrição'] ?? row['Descricao'] ?? '';
        valor = this.parseValor(row['Valor original da parcela (R$)'] ?? row['Valor'] ?? '0');
        valorPago = this.parseValor(row['Valor total pago da parcela (R$)'] ?? row['Valor pago'] ?? '0');
        valorAberto = this.parseValor(row['Valor total da parcela em aberto (R$)'] ?? row['Valor em aberto'] ?? '0');
        situacao = row['Situação'] ?? row['Situacao'] ?? 'Em aberto';
        tipoDetectado = 'despesa';
        categoria = row['Categoria 1'] ?? row['Categoria'] ?? '';
        contaBancaria = row['Conta bancária'] ?? row['Conta bancaria'] ?? '';
        formaPagamento = row['Forma de pagamento'] ?? '';
        notaFiscal = row['Nota fiscal'] ?? '';
        observacoes = row['Observações'] ?? row['Observacoes'] ?? '';
        recorrencia = row['Recorrência'] ?? '';
      }

      if (!descricao && valor === 0) continue;

      const sitLower = situacao.toLowerCase();
      let sitNorm = 'Em aberto';
      if (sitLower.includes('conciliado') || sitLower.includes('pago') || sitLower.includes('liquidado') || sitLower.includes('recebid')) {
        sitNorm = tipoDetectado === 'receita' ? 'Recebido' : 'Pago';
      }

      const grupoDre = tipoDetectado === 'receita'
        ? 'receita_bruta'
        : this.detectGrupoDre(descricao, categoria) === 'receita_bruta'
          ? 'desp_operacional'
          : this.detectGrupoDre(descricao, categoria);

      novasLinhas.push({
        dataVencimento: dataVenc,
        dataCompetencia: dataComp,
        descricao,
        valor,
        valorPago,
        valorAberto,
        situacao: sitNorm,
        categoria,
        contaBancaria,
        formaPagamento,
        notaFiscal,
        observacoes,
        recorrencia,
        grupoDre,
        tipoDetectado,
        arquivoOrigem: nomeArquivo,
      });
    }

    if (novasLinhas.length === 0) {
      this.messageService.add({ severity: 'warn', summary: `Nenhuma linha reconhecida em ${nomeArquivo}` });
      return;
    }

    // Acumular linhas (não substituir)
    this.linhas.update((atual) => [...atual, ...novasLinhas]);

    // Registrar arquivo
    const totalRec = novasLinhas.filter((l) => l.tipoDetectado === 'receita').reduce((s, l) => s + l.valor, 0);
    const totalDesp = novasLinhas.filter((l) => l.tipoDetectado === 'despesa').reduce((s, l) => s + l.valor, 0);
    const tipoArq: 'receita' | 'despesa' | 'misto' =
      totalRec > 0 && totalDesp === 0 ? 'receita' :
      totalDesp > 0 && totalRec === 0 ? 'despesa' : 'misto';

    this.arquivosCarregados.update((atual) => [
      ...atual.filter((a) => a.nome !== nomeArquivo),
      {
        nome: nomeArquivo,
        tipoDetectado: tipoArq,
        totalLinhas: novasLinhas.length,
        totalValor: totalRec + totalDesp,
        status: 'ok',
      },
    ]);
  }

  removerArquivo(nome: string) {
    this.linhas.update((atual) => atual.filter((l) => l.arquivoOrigem !== nome));
    this.arquivosCarregados.update((atual) => atual.filter((a) => a.nome !== nome));
  }

  private parseValor(raw: any): number {
    if (typeof raw === 'number') return Math.abs(raw);
    const str = String(raw).replace(/\s/g, '');
    if (str.includes(',')) {
      const num = parseFloat(str.replace(/\./g, '').replace(',', '.'));
      return isNaN(num) ? 0 : Math.abs(num);
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
  }

  private detectGrupoDre(descricao: string, categoria: string): GrupoDre {
    const texto = `${descricao} ${categoria}`.toLowerCase();
    for (const [keyword, grupo] of Object.entries(CATEGORIA_DRE_MAP)) {
      if (texto.includes(keyword)) return grupo;
    }
    return 'desp_operacional';
  }

  nextStep() {
    if (this.activeStep() < 2) this.activeStep.set(this.activeStep() + 1);
  }

  prevStep() {
    if (this.activeStep() > 0) this.activeStep.set(this.activeStep() - 1);
  }

  async executarImportacao() {
    const empresaId = this.empresaSelecionadaId;
    if (!empresaId) return;

    this.importing.set(true);

    const emp = this.empresaService.empresas().find((e) => e.id === empresaId)!;
    this.empresaService.setEmpresaAtiva(emp);
    await this.planoContasService.loadContas();
    const contas = this.planoContasService.contas();

    const lancamentos = this.linhas().map((l) => {
      const planoContaId = contas.find((c) => c.grupo_dre === l.grupoDre)?.id ?? contas[0]?.id;
      const parts = l.dataVencimento.split('/');
      const dataIso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : l.dataVencimento;
      const isPago = l.situacao !== 'Em aberto';

      return {
        descricao: l.descricao,
        tipo: l.tipoDetectado,
        valor: l.valor,
        data_vencimento: dataIso,
        status: isPago ? (l.tipoDetectado === 'receita' ? 'recebido' : 'pago') : 'pendente',
        data_pagamento: isPago ? dataIso : null,
        plano_conta_id: planoContaId,
        empresa_id: empresaId,
        fornecedor_cliente: l.categoria || null,
        documento: l.notaFiscal || null,
        observacao: l.observacoes || null,
      };
    });

    const { data } = await this.lancamentoService.supabaseInsert(lancamentos);
    const count = data?.length ?? 0;
    this.lancamentosImportados.set(count);

    // Buscar range completo de TODOS os lançamentos da empresa para o DRE
    const { data: todosDados } = await this.supabaseService.supabase
      .from('lancamentos')
      .select('data_vencimento')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });

    const todasDatas = (todosDados ?? []).map((l: any) => l.data_vencimento).sort();
    const dataInicio = todasDatas[0] ?? lancamentos[0]?.data_vencimento;
    const dataFim = todasDatas[todasDatas.length - 1] ?? lancamentos[lancamentos.length - 1]?.data_vencimento;

    const dre = await this.dreService.loadDre(empresaId, dataInicio, dataFim, this.empresaSelecionadaNome());
    this.dreResult.set(dre);

    this.messageService.add({ severity: 'success', summary: `${count} lançamentos importados com sucesso` });
    this.importing.set(false);
    this.activeStep.set(2);
  }

  compartilharDreWhatsApp() {
    const dre = this.dreResult();
    if (!dre) return;

    let msg = `📊 *DRE - ${dre.empresa_nome}*\n`;
    msg += `📅 Período: ${dre.periodo}\n\n`;

    for (const linha of dre.linhas) {
      if (linha.children) continue;
      const icon = linha.tipo === 'resultado' ? '📌' : linha.tipo === 'receita' ? '🟢' : '🔴';
      msg += `${icon} ${linha.label}: R$ ${linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${linha.percentual.toFixed(1)}%)\n`;
    }

    msg += `\n💰 *Lucro Líquido: R$ ${dre.lucro_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*`;
    msg += `\n\n_Enviado via BPO Financeiro_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  toggleExpand(label: string) {
    this.expandedRows[label] = !this.expandedRows[label];
  }

  openDetalhes(linha: any) {
    this.detalhesLabel = linha.label;
    this.detalhesLancamentos = linha.detalhes ?? [];
    this.detalhesTotal = this.detalhesLancamentos.reduce((s: number, d: any) => s + d.valor, 0);
    this.detalhesVisible = true;
  }

  getRowClass(linha: any): string {
    if (linha.tipo === 'ebitda') return 'ebitda-row';
    if (linha.tipo === 'resultado' && linha.destaque) return 'result-row destaque-row';
    if (linha.tipo === 'resultado') return 'result-row';
    if (linha.detalhes?.length) return 'clickable-row';
    return '';
  }

  getValorClass(linha: any): string {
    if (linha.tipo === 'resultado' || linha.tipo === 'ebitda') {
      return linha.valor >= 0 ? 'valor-pos bold' : 'valor-neg bold';
    }
    return '';
  }

  reset() {
    this.activeStep.set(0);
    this.linhas.set([]);
    this.arquivosCarregados.set([]);
    this.dreResult.set(null);
    this.lancamentosImportados.set(0);
  }
}
