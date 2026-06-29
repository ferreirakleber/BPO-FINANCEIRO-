import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LancamentoService, LancamentoFiltro } from '../../core/services/lancamento.service';
import { PlanoContasService } from '../../core/services/plano-contas.service';
import { ContaBancariaService } from '../../core/services/conta-bancaria.service';
import { Lancamento, TipoLancamento, StatusLancamento } from '../../core/models/lancamento.model';

@Component({
  selector: 'app-lancamentos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, DropdownModule, CalendarModule,
    TagModule, ToastModule, TextareaModule, FileUploadModule,
    ToolbarModule, ConfirmDialogModule, TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-header">
      <h2>Lançamentos Financeiros</h2>
      <div class="header-actions">
        @if (selectedLancamentos.length > 0) {
          <p-button
            label="Excluir Selecionados ({{ selectedLancamentos.length }})"
            icon="pi pi-trash"
            severity="danger"
            (onClick)="excluirSelecionados()"
          />
        }
        <p-button label="Importar Excel" icon="pi pi-file-excel" severity="secondary" (onClick)="importDialogVisible = true" />
        <p-button label="Novo Lançamento" icon="pi pi-plus" (onClick)="openNew()" />
      </div>
    </div>

    <!-- Pesquisa e Filtros -->
    <div class="filters">
      <span class="p-input-icon-left">
        <i class="pi pi-search"></i>
        <input pInputText (input)="dt.filterGlobal($any($event.target).value, 'contains')" placeholder="Buscar descrição, fornecedor..." style="width: 300px" />
      </span>
      <p-dropdown
        [(ngModel)]="filtro.tipo"
        [options]="tiposOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Tipo"
        [showClear]="true"
        (onChange)="applyFilter()"
      />
      <p-dropdown
        [(ngModel)]="filtro.status"
        [options]="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Status"
        [showClear]="true"
        (onChange)="applyFilter()"
      />
      <p-calendar
        [(ngModel)]="filtroDataInicio"
        dateFormat="dd/mm/yy"
        placeholder="Data Início"
        [showIcon]="true"
        (onSelect)="applyFilter()"
      />
      <p-calendar
        [(ngModel)]="filtroDataFim"
        dateFormat="dd/mm/yy"
        placeholder="Data Fim"
        [showIcon]="true"
        (onSelect)="applyFilter()"
      />
    </div>

    <!-- Resumo -->
    <div class="summary-cards">
      <div class="summary-card receitas">
        <span>Receitas</span>
        <strong>{{ totalReceitas() | currency:'BRL' }}</strong>
      </div>
      <div class="summary-card despesas">
        <span>Despesas</span>
        <strong>{{ totalDespesas() | currency:'BRL' }}</strong>
      </div>
      <div class="summary-card saldo">
        <span>Saldo</span>
        <strong>{{ saldo() | currency:'BRL' }}</strong>
      </div>
    </div>

    <p-table
      #dt
      [value]="lancamentoService.lancamentos()"
      [loading]="lancamentoService.loading()"
      [paginator]="true"
      [rows]="15"
      [rowHover]="true"
      [(selection)]="selectedLancamentos"
      [globalFilterFields]="['descricao', 'fornecedor_cliente', 'documento', 'observacao']"
      styleClass="p-datatable-striped p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 50px">
            <p-tableHeaderCheckbox />
          </th>
          <th>Vencimento</th>
          <th>Descrição</th>
          <th>Tipo</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Status</th>
          <th style="width: 150px">Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-lanc>
        <tr>
          <td>
            <p-tableCheckbox [value]="lanc" />
          </td>
          <td>{{ lanc.data_vencimento | date:'dd/MM/yyyy' }}</td>
          <td>
            {{ lanc.descricao }}
            @if (lanc.fornecedor_cliente) {
              <br><small class="text-secondary">{{ lanc.fornecedor_cliente }}</small>
            }
          </td>
          <td>
            <p-tag [value]="lanc.tipo" [severity]="getTipoSeverity(lanc.tipo)" />
          </td>
          <td>
            @if (lanc.plano_conta) {
              {{ lanc.plano_conta.codigo }} - {{ lanc.plano_conta.descricao }}
            }
          </td>
          <td [class]="lanc.tipo === 'receita' ? 'valor-positivo' : 'valor-negativo'">
            {{ lanc.tipo === 'receita' ? '+' : '-' }}{{ lanc.valor | currency:'BRL' }}
          </td>
          <td>
            <p-tag [value]="lanc.status" [severity]="getStatusSeverity(lanc.status)" />
          </td>
          <td>
            @if (lanc.status === 'pendente') {
              <p-button
                [icon]="lanc.tipo === 'receita' ? 'pi pi-check' : 'pi pi-money-bill'"
                [rounded]="true"
                [text]="true"
                severity="success"
                [pTooltip]="lanc.tipo === 'receita' ? 'Receber' : 'Pagar'"
                (onClick)="confirmarPagamento(lanc)"
              />
            }
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" (onClick)="openEdit(lanc)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDelete(lanc)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="8" style="text-align: center">Nenhum lançamento encontrado</td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Dialog Novo/Editar -->
    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editing ? 'Editar Lançamento' : 'Novo Lançamento'"
      [modal]="true"
      [style]="{ width: '600px' }"
    >
      <div class="form-grid">
        <div class="field">
          <label>Descrição</label>
          <input pInputText [(ngModel)]="form.descricao" class="w-full" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Tipo</label>
            <p-dropdown
              [(ngModel)]="form.tipo"
              [options]="tiposOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecione"
              styleClass="w-full"
            />
          </div>
          <div class="field">
            <label>Valor</label>
            <p-inputNumber [(ngModel)]="form.valor" mode="currency" currency="BRL" locale="pt-BR" styleClass="w-full" />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Data Vencimento</label>
            <p-calendar [(ngModel)]="formDataVencimento" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Status</label>
            <p-dropdown
              [(ngModel)]="form.status"
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecione"
              styleClass="w-full"
            />
          </div>
        </div>
        <div class="field">
          <label>Categoria (Plano de Contas)</label>
          <p-dropdown
            [(ngModel)]="form.plano_conta_id"
            [options]="planoContasOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecione"
            [filter]="true"
            styleClass="w-full"
          />
        </div>
        <div class="field">
          <label>Conta Bancária</label>
          <p-dropdown
            [(ngModel)]="form.conta_bancaria_id"
            [options]="contaBancariaOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Selecione"
            [showClear]="true"
            styleClass="w-full"
          />
        </div>
        <div class="field">
          <label>Fornecedor / Cliente</label>
          <input pInputText [(ngModel)]="form.fornecedor_cliente" class="w-full" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Documento</label>
            <input pInputText [(ngModel)]="form.documento" class="w-full" placeholder="NF, Boleto, etc." />
          </div>
        </div>
        <div class="field">
          <label>Observação</label>
          <textarea pInputTextarea [(ngModel)]="form.observacao" class="w-full" rows="2"></textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="dialogVisible = false" />
        <p-button label="Salvar" icon="pi pi-check" (onClick)="save()" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <!-- Dialog Importação CSV -->
    <p-dialog
      [(visible)]="importDialogVisible"
      header="Importar Lançamentos (CSV)"
      [modal]="true"
      [style]="{ width: '600px' }"
    >
      <p style="margin-bottom: 1rem">
        O arquivo CSV deve conter as colunas: <strong>data, descricao, tipo, valor, categoria, fornecedor</strong>
      </p>
      <p style="margin-bottom: 1rem; color: var(--text-color-secondary)">
        Formato de data: DD/MM/AAAA | Tipo: receita ou despesa | Separador: ponto-e-vírgula (;)
      </p>

      <input
        type="file"
        accept=".csv,.ofx"
        (change)="onFileSelect($event)"
        #fileInput
      />

      @if (importPreview().length > 0) {
        <div style="margin-top: 1rem">
          <p><strong>{{ importPreview().length }}</strong> lançamentos encontrados</p>
        </div>
      }

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="importDialogVisible = false" />
        <p-button
          label="Importar"
          icon="pi pi-upload"
          (onClick)="executeImport()"
          [loading]="importing()"
          [disabled]="importPreview().length === 0"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
    <p-toast />
  `,
  styles: `
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; }
    .header-actions { display: flex; gap: 0.5rem; }

    .filters {
      display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;
    }

    .summary-cards {
      display: flex; gap: 1rem; margin-bottom: 1.5rem;
    }

    .summary-card {
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      min-width: 180px;
    }

    .summary-card span { font-size: 0.85rem; opacity: 0.8; }
    .summary-card strong { font-size: 1.25rem; margin-top: 0.25rem; }
    .summary-card.receitas { background: #dcfce7; color: #166534; }
    .summary-card.despesas { background: #fee2e2; color: #991b1b; }
    .summary-card.saldo { background: #dbeafe; color: #1e40af; }

    .field { margin-bottom: 1rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
    .field-row { display: flex; gap: 1rem; }
    .field-row .field { flex: 1; }

    .valor-positivo { color: #22c55e; font-weight: 600; }
    .valor-negativo { color: #ef4444; font-weight: 600; }
    .text-secondary { color: var(--text-color-secondary); }
  `,
})
export class LancamentosComponent implements OnInit {
  dialogVisible = false;
  importDialogVisible = false;
  editing = false;
  editingId: string | null = null;
  saving = signal(false);
  importing = signal(false);
  selectedLancamentos: Lancamento[] = [];
  importPreview = signal<Partial<Lancamento>[]>([]);
  form: Partial<Lancamento> = {};
  formDataVencimento: Date | null = null;
  filtro: LancamentoFiltro = {};
  filtroDataInicio: Date | null = null;
  filtroDataFim: Date | null = null;

  tiposOptions = [
    { label: 'Receita', value: 'receita' },
    { label: 'Despesa', value: 'despesa' },
  ];

  statusOptions = [
    { label: 'Pendente', value: 'pendente' },
    { label: 'Pago', value: 'pago' },
    { label: 'Recebido', value: 'recebido' },
    { label: 'Cancelado', value: 'cancelado' },
  ];

  planoContasOptions = signal<{ label: string; value: string }[]>([]);
  contaBancariaOptions = signal<{ label: string; value: string }[]>([]);

  totalReceitas = computed(() =>
    this.lancamentoService.lancamentos()
      .filter((l) => l.tipo === 'receita' && l.status !== 'cancelado')
      .reduce((sum, l) => sum + l.valor, 0),
  );

  totalDespesas = computed(() =>
    this.lancamentoService.lancamentos()
      .filter((l) => l.tipo === 'despesa' && l.status !== 'cancelado')
      .reduce((sum, l) => sum + l.valor, 0),
  );

  saldo = computed(() => this.totalReceitas() - this.totalDespesas());

  constructor(
    public lancamentoService: LancamentoService,
    private planoContasService: PlanoContasService,
    private contaBancariaService: ContaBancariaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.lancamentoService.loadLancamentos(),
      this.planoContasService.loadContas(),
      this.contaBancariaService.loadContas(),
    ]);

    this.planoContasOptions.set(
      this.planoContasService.contas().map((c) => ({
        label: `${c.codigo} - ${c.descricao}`,
        value: c.id,
      })),
    );

    this.contaBancariaOptions.set(
      this.contaBancariaService.contas().map((c) => ({
        label: `${c.descricao} (${c.banco})`,
        value: c.id,
      })),
    );
  }

  openNew() {
    this.form = { tipo: 'despesa', status: 'pendente' };
    this.formDataVencimento = null;
    this.editing = false;
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEdit(lanc: Lancamento) {
    this.form = { ...lanc };
    this.formDataVencimento = new Date(lanc.data_vencimento + 'T12:00:00');
    this.editing = true;
    this.editingId = lanc.id;
    this.dialogVisible = true;
  }

  async save() {
    if (!this.form.descricao || !this.form.tipo || !this.form.valor || !this.formDataVencimento || !this.form.plano_conta_id) {
      this.messageService.add({ severity: 'warn', summary: 'Preencha os campos obrigatórios' });
      return;
    }

    this.form.data_vencimento = this.formatDate(this.formDataVencimento);
    this.saving.set(true);

    if (this.editing && this.editingId) {
      const { plano_conta, conta_bancaria, ...updates } = this.form as any;
      await this.lancamentoService.update(this.editingId, updates);
      this.messageService.add({ severity: 'success', summary: 'Lançamento atualizado' });
    } else {
      await this.lancamentoService.create(this.form);
      this.messageService.add({ severity: 'success', summary: 'Lançamento criado' });
    }

    this.saving.set(false);
    this.dialogVisible = false;
  }

  confirmarPagamento(lanc: Lancamento) {
    const action = lanc.tipo === 'receita' ? 'receber' : 'pagar';
    this.confirmationService.confirm({
      message: `Confirmar ${action} "${lanc.descricao}" no valor de R$ ${lanc.valor.toFixed(2)}?`,
      header: 'Confirmar',
      icon: 'pi pi-check',
      accept: async () => {
        const status: StatusLancamento = lanc.tipo === 'receita' ? 'recebido' : 'pago';
        await this.lancamentoService.updateStatus(lanc.id, status, new Date().toISOString().split('T')[0]);
        this.messageService.add({ severity: 'success', summary: `Lançamento ${status}` });
      },
    });
  }

  excluirSelecionados() {
    this.confirmationService.confirm({
      message: `Deseja excluir permanentemente ${this.selectedLancamentos.length} lançamentos selecionados?`,
      header: 'Excluir em massa',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const ids = this.selectedLancamentos.map((l) => l.id);
        const count = await this.lancamentoService.deleteMany(ids);
        this.selectedLancamentos = [];
        this.messageService.add({ severity: 'success', summary: `${count} lançamentos excluídos` });
      },
    });
  }

  confirmDelete(lanc: Lancamento) {
    this.confirmationService.confirm({
      message: `Cancelar o lançamento "${lanc.descricao}"?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        await this.lancamentoService.delete(lanc.id);
        this.messageService.add({ severity: 'success', summary: 'Lançamento cancelado' });
      },
    });
  }

  applyFilter() {
    this.filtro.dataInicio = this.filtroDataInicio ? this.formatDate(this.filtroDataInicio) : undefined;
    this.filtro.dataFim = this.filtroDataFim ? this.formatDate(this.filtroDataFim) : undefined;
    this.lancamentoService.loadLancamentos(this.filtro);
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith('.csv')) {
        this.parseCsv(content);
      } else if (file.name.endsWith('.ofx')) {
        this.parseOfx(content);
      }
    };
    reader.readAsText(file);
  }

  private parseCsv(content: string) {
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return;

    const rows: Partial<Lancamento>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c) => c.trim().replace(/"/g, ''));
      if (cols.length < 4) continue;

      const [data, descricao, tipo, valorStr, categoria, fornecedor] = cols;
      const valor = parseFloat(valorStr.replace(',', '.'));
      if (isNaN(valor)) continue;

      const parts = data.split('/');
      const dataFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : data;

      rows.push({
        descricao,
        tipo: (tipo?.toLowerCase() === 'receita' ? 'receita' : 'despesa') as TipoLancamento,
        valor: Math.abs(valor),
        data_vencimento: dataFormatted,
        status: 'pendente' as StatusLancamento,
        fornecedor_cliente: fornecedor || null,
      });
    }

    this.importPreview.set(rows);
  }

  private parseOfx(content: string) {
    const rows: Partial<Lancamento>[] = [];
    const transactions = content.split('<STMTTRN>').slice(1);

    for (const tx of transactions) {
      const getValue = (tag: string) => {
        const match = tx.match(new RegExp(`<${tag}>([^<\\n]+)`));
        return match?.[1]?.trim() ?? '';
      };

      const dtPosted = getValue('DTPOSTED');
      const amount = parseFloat(getValue('TRNAMT').replace(',', '.'));
      const memo = getValue('MEMO') || getValue('NAME');

      if (!dtPosted || isNaN(amount)) continue;

      const year = dtPosted.substring(0, 4);
      const month = dtPosted.substring(4, 6);
      const day = dtPosted.substring(6, 8);

      rows.push({
        descricao: memo,
        tipo: (amount >= 0 ? 'receita' : 'despesa') as TipoLancamento,
        valor: Math.abs(amount),
        data_vencimento: `${year}-${month}-${day}`,
        status: 'pendente' as StatusLancamento,
      });
    }

    this.importPreview.set(rows);
  }

  async executeImport() {
    const rows = this.importPreview();
    if (rows.length === 0) return;

    const defaultPlano = this.planoContasService.contas()[0];
    if (!defaultPlano) {
      this.messageService.add({ severity: 'error', summary: 'Cadastre ao menos uma conta no Plano de Contas antes de importar' });
      return;
    }

    this.importing.set(true);

    const rowsWithPlano = rows.map((r) => ({
      ...r,
      plano_conta_id: defaultPlano.id,
    }));

    const count = await this.lancamentoService.importFromCsv(rowsWithPlano);
    this.messageService.add({ severity: 'success', summary: `${count} lançamentos importados` });

    this.importing.set(false);
    this.importPreview.set([]);
    this.importDialogVisible = false;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getTipoSeverity(tipo: TipoLancamento): 'success' | 'danger' | 'info' {
    return tipo === 'receita' ? 'success' : tipo === 'despesa' ? 'danger' : 'info';
  }

  getStatusSeverity(status: StatusLancamento): 'success' | 'warn' | 'danger' | 'info' {
    const map: Record<StatusLancamento, 'success' | 'warn' | 'danger' | 'info'> = {
      pendente: 'warn',
      pago: 'success',
      recebido: 'success',
      cancelado: 'danger',
    };
    return map[status];
  }
}
