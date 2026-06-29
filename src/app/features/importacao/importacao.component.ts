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
import { MessageService, MenuItem } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';
import { ChartModule } from 'primeng/chart';
import * as XLSX from 'xlsx';
import { EmpresaService } from '../../core/services/empresa.service';
import { PlanoContasService } from '../../core/services/plano-contas.service';
import { LancamentoService } from '../../core/services/lancamento.service';
import { DreService } from '../../core/services/dre.service';
import { PlanoConta, GrupoDre } from '../../core/models/plano-contas.model';
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
  selecionado: boolean;
}

const CATEGORIA_DRE_MAP: Record<string, GrupoDre> = {
  'receita': 'receita_bruta', 'faturamento': 'receita_bruta', 'vendas': 'receita_bruta',
  'imposto': 'deducoes', 'impostos': 'deducoes',
  'custo': 'custos', 'cmv': 'custos', 'csp': 'custos',
  'administrativ': 'desp_admin', 'aluguel': 'desp_admin', 'locação': 'desp_admin',
  'limpeza': 'desp_admin', 'manutenção': 'desp_admin', 'manutencao': 'desp_admin',
  'escritorio': 'desp_admin', 'escritório': 'desp_admin',
  'comercial': 'desp_comercial', 'comissao': 'desp_comercial', 'comissão': 'desp_comercial',
  'financeiro': 'desp_financeira', 'financeira': 'desp_financeira', 'juros': 'desp_financeira',
  'tarifa': 'desp_financeira', 'banco': 'desp_financeira', 'iof': 'desp_financeira',
  'tribut': 'desp_tributaria', 'das': 'desp_tributaria', 'simples': 'desp_tributaria',
  'inss': 'desp_tributaria', 'fgts': 'desp_tributaria', 'irrf': 'desp_tributaria',
  'pessoal': 'desp_pessoal', 'salario': 'desp_pessoal', 'salário': 'desp_pessoal',
  'folha': 'desp_pessoal', 'prolabore': 'desp_pessoal', 'pró-labore': 'desp_pessoal',
  'vale': 'desp_pessoal', 'beneficio': 'desp_pessoal', 'benefício': 'desp_pessoal',
  'reembolso': 'desp_pessoal', 'viagem': 'desp_pessoal',
  'marketing': 'desp_marketing', 'publicidade': 'desp_marketing', 'propaganda': 'desp_marketing',
  'sistema': 'desp_operacional', 'software': 'desp_operacional', 'licença': 'desp_operacional',
  'internet': 'desp_operacional', 'telefone': 'desp_operacional', 'telecom': 'desp_operacional',
  'seguro': 'desp_operacional', 'contabil': 'desp_operacional', 'contábil': 'desp_operacional',
  'ir ': 'ir_csll', 'csll': 'ir_csll', 'irpj': 'ir_csll',
};

@Component({
  selector: 'app-importacao',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, DropdownModule,
    TableModule, TagModule, StepsModule, ToastModule, TabViewModule, ChartModule,
  ],
  providers: [MessageService],
  template: `
    <div class="page-header">
      <h2>Importar Extratos Financeiros</h2>
    </div>

    <p-steps [model]="steps" [activeIndex]="activeStep()" [readonly]="true" styleClass="mb-steps" />

    <!-- Step 1: Upload -->
    @if (activeStep() === 0) {
      <p-card header="1. Selecione o arquivo e a empresa">
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
            <label>Arquivo Excel (.xlsx, .xls) ou CSV</label>
            <div class="file-drop" (click)="fileInput.click()">
              <i class="pi pi-cloud-upload" style="font-size: 2.5rem; color: var(--primary-color)"></i>
              <p>Clique para selecionar o arquivo</p>
              <small>Formato: Visão Contas a Pagar (.xls, .xlsx, .csv)</small>
              @if (fileName()) {
                <p-tag [value]="fileName()!" severity="success" styleClass="mt-1" />
              }
            </div>
            <input #fileInput type="file" accept=".xlsx,.xls,.csv" (change)="onFileSelect($event)" style="display: none" />
          </div>
        </div>

        <div style="text-align: right; margin-top: 1rem">
          <p-button label="Próximo" icon="pi pi-arrow-right" (onClick)="nextStep()" [disabled]="!canAdvanceStep1()" />
        </div>
      </p-card>
    }

    <!-- Step 2: Preview e classificação -->
    @if (activeStep() === 1) {
      <p-card header="2. Revise os lançamentos">
        <div class="summary-bar">
          <div class="stat">
            <span>Total de lançamentos</span>
            <strong>{{ linhas().length }}</strong>
          </div>
          <div class="stat aberto">
            <span>Em Aberto</span>
            <strong>{{ qtdAberto() }} | {{ totalAberto() | currency:'BRL' }}</strong>
          </div>
          <div class="stat pago">
            <span>Pagos</span>
            <strong>{{ qtdPago() }} | {{ totalPago() | currency:'BRL' }}</strong>
          </div>
          <div class="stat receita">
            <span>Receitas</span>
            <strong>{{ totalReceitas() | currency:'BRL' }}</strong>
          </div>
          <div class="stat despesa">
            <span>Despesas</span>
            <strong>{{ totalDespesas() | currency:'BRL' }}</strong>
          </div>
          <div class="stat total">
            <span>Valor Total</span>
            <strong>{{ totalGeral() | currency:'BRL' }}</strong>
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
              <th style="width: 100px">Situação</th>
              <th style="text-align: right; width: 120px">Valor</th>
              <th style="text-align: right; width: 120px">Em Aberto</th>
              <th style="width: 180px">Grupo DRE</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-linha>
            <tr>
              <td>{{ linha.dataVencimento }}</td>
              <td>
                {{ linha.descricao }}
                @if (linha.contaBancaria) {
                  <br><small class="text-muted">{{ linha.contaBancaria }}</small>
                }
              </td>
              <td><small>{{ linha.categoria }}</small></td>
              <td>
                <p-tag
                  [value]="linha.situacao"
                  [severity]="linha.situacao === 'Em aberto' ? 'warn' : 'success'"
                />
              </td>
              <td style="text-align: right" [class]="linha.grupoDre === 'receita_bruta' ? 'valor-pos' : 'valor-neg'">
            {{ linha.valor | currency:'BRL' }}
          </td>
              <td style="text-align: right" [class]="linha.valorAberto > 0 ? 'valor-neg' : ''">
                {{ linha.valorAberto | currency:'BRL' }}
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
          <h3>DRE - {{ empresaSelecionadaNome() }}</h3>
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
                  </tr>
                </thead>
                <tbody>
                  @for (linha of dreResult()!.linhas; track linha.label) {
                    <tr [class]="linha.tipo === 'resultado' ? 'result-row' : ''">
                      <td [class]="linha.tipo === 'resultado' ? 'bold' : ''">{{ linha.label }}</td>
                      <td class="text-right" [class]="getValorClass(linha)">{{ linha.valor | currency:'BRL' }}</td>
                      <td class="text-right">{{ linha.percentual | number:'1.1-1' }}%</td>
                    </tr>
                    @if (linha.children) {
                      @for (child of linha.children; track child.label) {
                        <tr class="child-row">
                          <td style="padding-left: 2rem">{{ child.label }}</td>
                          <td class="text-right">{{ child.valor | currency:'BRL' }}</td>
                          <td class="text-right">{{ child.percentual | number:'1.1-1' }}%</td>
                        </tr>
                      }
                    }
                  }
                </tbody>
              </table>
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

    .upload-area { max-width: 600px; }
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

    .summary-bar {
      display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .stat { display: flex; flex-direction: column; padding: 0.75rem 1.25rem; border-radius: 8px; background: var(--surface-ground); }
    .stat span { font-size: 0.8rem; color: var(--text-color-secondary); }
    .stat strong { font-size: 1.1rem; }
    .stat.aberto strong { color: #f59e0b; }
    .stat.pago strong { color: #22c55e; }
    .stat.receita strong { color: #22c55e; }
    .stat.despesa strong { color: #ef4444; }
    .stat.total strong { color: #3b82f6; }

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
  `,
})
export class ImportacaoComponent implements OnInit {
  activeStep = signal(0);
  fileName = signal<string | null>(null);
  linhas = signal<LinhaExtrato[]>([]);
  importing = signal(false);
  dreResult = signal<DreData | null>(null);
  lancamentosImportados = signal(0);
  empresaSelecionadaId: string | null = null;

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
    { label: 'Outras Receitas/Despesas', value: 'outras_receitas_despesas' },
    { label: 'IR / CSLL', value: 'ir_csll' },
  ];

  empresaOptions = signal<{ label: string; value: string }[]>([]);

  chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
  };

  canAdvanceStep1 = computed(() => !!this.empresaSelecionadaId && this.linhas().length > 0);

  qtdAberto = computed(() => this.linhas().filter((l) => l.situacao === 'Em aberto').length);
  qtdPago = computed(() => this.linhas().filter((l) => l.situacao !== 'Em aberto').length);
  totalAberto = computed(() => this.linhas().filter((l) => l.situacao === 'Em aberto').reduce((s, l) => s + l.valorAberto, 0));
  totalPago = computed(() => this.linhas().filter((l) => l.situacao !== 'Em aberto').reduce((s, l) => s + l.valor, 0));
  totalGeral = computed(() => this.linhas().reduce((s, l) => s + l.valor, 0));
  totalReceitas = computed(() => this.linhas().filter((l) => l.grupoDre === 'receita_bruta').reduce((s, l) => s + l.valor, 0));
  totalDespesas = computed(() => this.linhas().filter((l) => l.grupoDre !== 'receita_bruta').reduce((s, l) => s + l.valor, 0));

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

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(sheet, { raw: false });
      this.parseRows(json);
    };
    reader.readAsArrayBuffer(file);
  }

  private parseRows(rows: any[]) {
    if (rows.length === 0) return;

    const keys = Object.keys(rows[0]);
    const has = (hint: string) => keys.some((k) => k.toLowerCase().includes(hint));

    // Detectar formato
    const isExtrato = has('data movimento') || has('saldo conta');
    const isContasPagar = has('data de vencimento') || has('parcela em aberto');

    const linhas: LinhaExtrato[] = [];

    for (const row of rows) {
      let dataVenc: string;
      let dataComp: string;
      let descricao: string;
      let valor: number;
      let valorPago: number;
      let valorAberto: number;
      let situacao: string;
      let categoria: string;
      let contaBancaria: string;
      let formaPagamento: string;
      let notaFiscal: string;
      let observacoes: string;
      let recorrencia: string;
      let tipo: string;

      if (isExtrato) {
        // Formato Extrato Financeiro
        dataVenc = row['Data movimento'] ?? row['Data original de vencimento'] ?? '';
        dataComp = row['Data de competência'] ?? '';
        descricao = row['Descrição'] ?? '';
        valor = this.parseValor(row['Valor (R$)'] ?? row['Valor original (R$)'] ?? '0');
        valorPago = row['Situação']?.toLowerCase()?.includes('conciliado') || row['Situação']?.toLowerCase()?.includes('pago') ? valor : 0;
        valorAberto = valorPago > 0 ? 0 : valor;
        situacao = row['Situação'] ?? 'Em aberto';
        tipo = row['Tipo'] ?? '';
        categoria = row['Categoria 1'] ?? '';
        contaBancaria = row['Conta bancária'] ?? '';
        formaPagamento = row['Forma de pgto/recbto'] ?? '';
        notaFiscal = row['Nota fiscal'] ?? '';
        observacoes = row['Observações'] ?? '';
        recorrencia = row['Recorrência'] ?? '';
      } else {
        // Formato Visão Contas a Pagar
        dataVenc = row['Data de vencimento'] ?? row['Data vencimento'] ?? '';
        dataComp = row['Data de competência'] ?? row['Data competência'] ?? '';
        descricao = row['Descrição'] ?? row['Descricao'] ?? '';
        valor = this.parseValor(row['Valor original da parcela (R$)'] ?? row['Valor'] ?? '0');
        valorPago = this.parseValor(row['Valor total pago da parcela (R$)'] ?? row['Valor pago'] ?? '0');
        valorAberto = this.parseValor(row['Valor total da parcela em aberto (R$)'] ?? row['Valor em aberto'] ?? '0');
        situacao = row['Situação'] ?? row['Situacao'] ?? 'Em aberto';
        tipo = 'Despesa';
        categoria = row['Categoria 1'] ?? row['Categoria'] ?? '';
        contaBancaria = row['Conta bancária'] ?? row['Conta bancaria'] ?? '';
        formaPagamento = row['Forma de pagamento'] ?? '';
        notaFiscal = row['Nota fiscal'] ?? '';
        observacoes = row['Observações'] ?? row['Observacoes'] ?? '';
        recorrencia = row['Recorrência'] ?? '';
      }

      if (!descricao && valor === 0) continue;

      // Normalizar situação
      const sitLower = situacao.toLowerCase();
      let sitNorm = 'Em aberto';
      if (sitLower.includes('conciliado') || sitLower.includes('pago') || sitLower.includes('liquidado') || sitLower.includes('recebid')) {
        sitNorm = tipo.toLowerCase() === 'receita' ? 'Recebido' : 'Pago';
      }

      const grupoDre = this.detectGrupoDre(descricao, categoria, tipo);

      linhas.push({
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
        selecionado: true,
      });
    }

    this.linhas.set(linhas);
  }

  private parseValor(raw: any): number {
    if (typeof raw === 'number') return Math.abs(raw);
    const str = String(raw).replace(/\s/g, '');
    const num = parseFloat(str.replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? 0 : Math.abs(num);
  }

  private detectGrupoDre(descricao: string, categoria: string, tipo?: string): GrupoDre {
    const texto = `${descricao} ${categoria}`.toLowerCase();

    if (tipo?.toLowerCase() === 'receita') return 'receita_bruta';

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
        tipo: l.grupoDre === 'receita_bruta' ? 'receita' : 'despesa',
        valor: l.valor,
        data_vencimento: dataIso,
        status: isPago ? (l.grupoDre === 'receita_bruta' ? 'recebido' : 'pago') : 'pendente',
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

    // Gerar DRE
    const datas = lancamentos.map((l) => l.data_vencimento).sort();
    const dataInicio = datas[0];
    const dataFim = datas[datas.length - 1];
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

  getValorClass(linha: any): string {
    if (linha.tipo === 'resultado') {
      return linha.valor >= 0 ? 'valor-pos bold' : 'valor-neg bold';
    }
    return '';
  }

  reset() {
    this.activeStep.set(0);
    this.linhas.set([]);
    this.fileName.set(null);
    this.dreResult.set(null);
    this.lancamentosImportados.set(0);
  }
}
