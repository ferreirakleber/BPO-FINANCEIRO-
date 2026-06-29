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
import { AuthService } from '../../core/services/auth.service';
import { Empresa } from '../../core/models/empresa.model';
import { PlanoConta, GrupoDre } from '../../core/models/plano-contas.model';
import { DreData } from '../../core/models/dre.model';

interface LinhaExtrato {
  data: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria: string;
  grupoDre: GrupoDre | null;
  planoContaId: string | null;
}

const CATEGORIA_DRE_MAP: Record<string, GrupoDre> = {
  'receita': 'receita_bruta',
  'receitas': 'receita_bruta',
  'faturamento': 'receita_bruta',
  'vendas': 'receita_bruta',
  'servicos': 'receita_bruta',
  'serviços': 'receita_bruta',
  'imposto': 'deducoes',
  'impostos': 'deducoes',
  'deducao': 'deducoes',
  'deducoes': 'deducoes',
  'deduções': 'deducoes',
  'custo': 'custos',
  'custos': 'custos',
  'cmv': 'custos',
  'csp': 'custos',
  'administrativo': 'desp_admin',
  'administrativa': 'desp_admin',
  'admin': 'desp_admin',
  'aluguel': 'desp_admin',
  'comercial': 'desp_comercial',
  'comissao': 'desp_comercial',
  'comissão': 'desp_comercial',
  'financeiro': 'desp_financeira',
  'financeira': 'desp_financeira',
  'juros': 'desp_financeira',
  'tarifa': 'desp_financeira',
  'tarifas': 'desp_financeira',
  'tributo': 'desp_tributaria',
  'tributaria': 'desp_tributaria',
  'tributário': 'desp_tributaria',
  'pessoal': 'desp_pessoal',
  'salario': 'desp_pessoal',
  'salário': 'desp_pessoal',
  'folha': 'desp_pessoal',
  'marketing': 'desp_marketing',
  'publicidade': 'desp_marketing',
  'propaganda': 'desp_marketing',
  'operacional': 'desp_operacional',
  'ir': 'ir_csll',
  'csll': 'ir_csll',
  'irpj': 'ir_csll',
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
      <h2>Importação de Extratos</h2>
    </div>

    <p-steps [model]="steps" [activeIndex]="activeStep()" [readonly]="true" styleClass="mb-steps" />

    <!-- Step 1: Upload -->
    @if (activeStep() === 0) {
      <p-card header="1. Selecione o arquivo e a empresa">
        <div class="upload-area">
          <div class="field">
            <label>Empresa</label>
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
            <div class="file-drop" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
              <i class="pi pi-cloud-upload" style="font-size: 2.5rem; color: var(--primary-color)"></i>
              <p>Clique ou arraste o arquivo aqui</p>
              <small>Formatos aceitos: .xlsx, .xls, .csv</small>
              @if (fileName()) {
                <p-tag [value]="fileName()!" severity="success" styleClass="mt-tag" />
              }
            </div>
            <input #fileInput type="file" accept=".xlsx,.xls,.csv" (change)="onFileSelect($event)" style="display: none" />
          </div>

          <p style="color: var(--text-color-secondary); font-size: 0.9rem; margin-top: 0.5rem">
            A planilha deve conter colunas como: <strong>Data, Descrição, Valor, Tipo/Categoria</strong>.<br>
            O sistema tentará identificar automaticamente as colunas e classificar na DRE.
          </p>
        </div>

        <div style="text-align: right; margin-top: 1rem">
          <p-button label="Próximo" icon="pi pi-arrow-right" (onClick)="nextStep()" [disabled]="!canAdvanceStep1()" />
        </div>
      </p-card>
    }

    <!-- Step 2: Mapeamento -->
    @if (activeStep() === 1) {
      <p-card header="2. Revise a classificação dos lançamentos">
        <div class="mapping-header">
          <span><strong>{{ linhasExtrato().length }}</strong> lançamentos encontrados</span>
          <div class="mapping-stats">
            <p-tag value="Receitas: {{ totalReceitas() | currency:'BRL' }}" severity="success" />
            <p-tag value="Despesas: {{ totalDespesas() | currency:'BRL' }}" severity="danger" />
          </div>
        </div>

        <p-table
          [value]="linhasExtrato()"
          [paginator]="true"
          [rows]="15"
          [rowHover]="true"
          styleClass="p-datatable-sm p-datatable-striped"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th style="text-align: right">Valor</th>
              <th>Categoria DRE</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-linha let-i="rowIndex">
            <tr>
              <td>{{ linha.data }}</td>
              <td>{{ linha.descricao }}</td>
              <td>
                <p-dropdown
                  [(ngModel)]="linha.tipo"
                  [options]="tipoOptions"
                  optionLabel="label"
                  optionValue="value"
                  styleClass="w-8rem"
                />
              </td>
              <td style="text-align: right" [class]="linha.tipo === 'receita' ? 'valor-pos' : 'valor-neg'">
                {{ linha.valor | currency:'BRL' }}
              </td>
              <td>
                <p-dropdown
                  [(ngModel)]="linha.grupoDre"
                  [options]="grupoDreOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Classificar"
                  styleClass="w-14rem"
                  (onChange)="onGrupoDreChange(linha)"
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

    <!-- Step 3: DRE -->
    @if (activeStep() === 2) {
      <p-card>
        <div class="result-header">
          <h3>DRE - {{ empresaSelecionadaNome() }}</h3>
          <p-button icon="pi pi-whatsapp" label="Enviar DRE via WhatsApp" severity="success" (onClick)="compartilharDreWhatsApp()" />
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
                      <td class="text-right" [class]="getValorClass(linha)">
                        {{ linha.valor | currency:'BRL' }}
                      </td>
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

        <div style="display: flex; justify-content: space-between; margin-top: 1rem">
          <p-button label="Nova Importação" icon="pi pi-refresh" severity="secondary" (onClick)="reset()" />
        </div>
      </p-card>
    }

    <p-toast />
  `,
  styles: `
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; }
    :host ::ng-deep .mb-steps { margin-bottom: 2rem; }

    .upload-area { max-width: 600px; }
    .field { margin-bottom: 1rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-weight: 600; }

    .file-drop {
      border: 2px dashed var(--surface-border); border-radius: 10px;
      padding: 2rem; text-align: center; cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .file-drop:hover { border-color: var(--primary-color); background: var(--surface-hover); }
    .file-drop p { margin: 0.5rem 0; }
    .file-drop small { color: var(--text-color-secondary); }
    :host ::ng-deep .mt-tag { margin-top: 0.5rem; }

    .mapping-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;
    }
    .mapping-stats { display: flex; gap: 0.5rem; }

    .valor-pos { color: #22c55e; font-weight: 600; }
    .valor-neg { color: #ef4444; font-weight: 600; }

    .result-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
    }
    .result-header h3 { margin: 0; }

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
  linhasExtrato = signal<LinhaExtrato[]>([]);
  importing = signal(false);
  dreResult = signal<DreData | null>(null);
  empresaSelecionadaId: string | null = null;

  steps: MenuItem[] = [
    { label: 'Upload' },
    { label: 'Classificação' },
    { label: 'DRE' },
  ];

  tipoOptions = [
    { label: 'Receita', value: 'receita' },
    { label: 'Despesa', value: 'despesa' },
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
    scales: { y: { ticks: { callback: (v: number) => `R$ ${(v / 1000).toFixed(0)}k` } } },
  };

  totalReceitas = computed(() =>
    this.linhasExtrato().filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0),
  );
  totalDespesas = computed(() =>
    this.linhasExtrato().filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0),
  );

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

  canAdvanceStep1 = computed(() => !!this.empresaSelecionadaId && this.linhasExtrato().length > 0);

  constructor(
    public empresaService: EmpresaService,
    private planoContasService: PlanoContasService,
    private lancamentoService: LancamentoService,
    private dreService: DreService,
    private authService: AuthService,
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
    if (file) this.processFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File) {
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
    const findCol = (hints: string[]) =>
      keys.find((k) => hints.some((h) => k.toLowerCase().includes(h))) ?? null;

    const colData = findCol(['data', 'date', 'vencimento', 'dt']);
    const colDesc = findCol(['descricao', 'descrição', 'desc', 'historico', 'histórico', 'memo', 'nome']);
    const colValor = findCol(['valor', 'value', 'montante', 'total', 'amount']);
    const colTipo = findCol(['tipo', 'type', 'natureza']);
    const colCategoria = findCol(['categoria', 'category', 'grupo', 'classificacao', 'classificação', 'conta']);

    const linhas: LinhaExtrato[] = [];

    for (const row of rows) {
      const rawValor = row[colValor ?? ''] ?? row[keys.find((k) => {
        const v = row[k];
        return typeof v === 'string' && /[\d,.]+/.test(v) && !isNaN(parseFloat(v.replace(/\./g, '').replace(',', '.')));
      }) ?? ''];

      if (!rawValor) continue;

      const valorNum = typeof rawValor === 'number'
        ? rawValor
        : parseFloat(String(rawValor).replace(/\./g, '').replace(',', '.'));

      if (isNaN(valorNum) || valorNum === 0) continue;

      const rawData = row[colData ?? ''] ?? '';
      let dataFormatted = this.parseDate(rawData);

      const descricao = row[colDesc ?? ''] ?? row[keys[1]] ?? 'Sem descrição';
      const rawTipo = row[colTipo ?? ''] ?? '';
      const rawCategoria = row[colCategoria ?? ''] ?? '';

      let tipo: 'receita' | 'despesa' = valorNum >= 0 ? 'receita' : 'despesa';
      if (rawTipo) {
        const tipoLower = String(rawTipo).toLowerCase();
        if (tipoLower.includes('receita') || tipoLower.includes('credito') || tipoLower.includes('crédito') || tipoLower === 'c') {
          tipo = 'receita';
        } else if (tipoLower.includes('despesa') || tipoLower.includes('debito') || tipoLower.includes('débito') || tipoLower === 'd') {
          tipo = 'despesa';
        }
      }

      const grupoDre = this.detectGrupoDre(descricao, rawCategoria, tipo);

      linhas.push({
        data: dataFormatted,
        descricao: String(descricao).trim(),
        valor: Math.abs(valorNum),
        tipo,
        categoria: String(rawCategoria).trim(),
        grupoDre,
        planoContaId: null,
      });
    }

    this.linhasExtrato.set(linhas);
  }

  private parseDate(raw: any): string {
    if (!raw) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }

    const str = String(raw).trim();

    // DD/MM/YYYY
    const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) return `${brMatch[1].padStart(2, '0')}/${brMatch[2].padStart(2, '0')}/${brMatch[3]}`;

    // YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

    // Excel serial number
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const d = new Date((num - 25569) * 86400 * 1000);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    return str;
  }

  private detectGrupoDre(descricao: string, categoria: string, tipo: 'receita' | 'despesa'): GrupoDre {
    const textos = `${descricao} ${categoria}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    for (const [keyword, grupo] of Object.entries(CATEGORIA_DRE_MAP)) {
      const normalized = keyword.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (textos.includes(normalized)) return grupo;
    }

    if (tipo === 'receita') return 'receita_bruta';
    return 'desp_operacional';
  }

  onGrupoDreChange(linha: LinhaExtrato) {
    if (linha.grupoDre === 'receita_bruta' || linha.grupoDre === 'outras_receitas_despesas') {
      linha.tipo = 'receita';
    } else {
      linha.tipo = 'despesa';
    }
  }

  nextStep() {
    if (this.activeStep() < 2) this.activeStep.set(this.activeStep() + 1);
  }

  prevStep() {
    if (this.activeStep() > 0) this.activeStep.set(this.activeStep() - 1);
  }

  async executarImportacao() {
    const linhas = this.linhasExtrato();
    const empresaId = this.empresaSelecionadaId;
    if (!empresaId || linhas.length === 0) return;

    this.importing.set(true);

    // Carregar plano de contas da empresa selecionada
    const oldEmpresa = this.empresaService.empresaAtiva();
    const emp = this.empresaService.empresas().find((e) => e.id === empresaId)!;
    this.empresaService.setEmpresaAtiva(emp);
    await this.planoContasService.loadContas();

    const contas = this.planoContasService.contas();

    // Mapear linhas para lançamentos
    const lancamentos = linhas.map((l) => {
      const planoContaId = this.findPlanoContaId(contas, l.grupoDre) ?? contas[0]?.id;

      const parts = l.data.split('/');
      const dataIso = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : l.data;

      return {
        descricao: l.descricao,
        tipo: l.tipo as any,
        valor: l.valor,
        data_vencimento: dataIso,
        status: 'pago' as any,
        data_pagamento: dataIso,
        plano_conta_id: planoContaId,
        empresa_id: empresaId,
        fornecedor_cliente: l.categoria || null,
      };
    });

    // Inserir lançamentos
    const { data } = await this.lancamentoService.supabaseInsert(lancamentos);
    const count = data?.length ?? 0;

    // Gerar DRE
    const datas = linhas.map((l) => {
      const parts = l.data.split('/');
      return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : l.data;
    }).sort();

    const dataInicio = datas[0] ?? new Date().toISOString().split('T')[0];
    const dataFim = datas[datas.length - 1] ?? dataInicio;

    const dre = await this.dreService.loadDre(empresaId, dataInicio, dataFim, this.empresaSelecionadaNome());
    this.dreResult.set(dre);

    if (oldEmpresa) this.empresaService.setEmpresaAtiva(oldEmpresa);

    this.messageService.add({ severity: 'success', summary: `${count} lançamentos importados. DRE gerada.` });
    this.importing.set(false);
    this.activeStep.set(2);
  }

  private findPlanoContaId(contas: PlanoConta[], grupoDre: GrupoDre | null): string | null {
    if (!grupoDre) return null;
    return contas.find((c) => c.grupo_dre === grupoDre)?.id ?? null;
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
    this.linhasExtrato.set([]);
    this.fileName.set(null);
    this.dreResult.set(null);
  }
}
