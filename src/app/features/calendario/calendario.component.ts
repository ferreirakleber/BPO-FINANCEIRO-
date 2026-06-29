import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SupabaseService } from '../../core/services/supabase.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { LancamentoService } from '../../core/services/lancamento.service';
import { PlanoContasService } from '../../core/services/plano-contas.service';
import { Lancamento, StatusLancamento } from '../../core/models/lancamento.model';

interface DiaAgenda {
  data: string;
  dataFormatada: string;
  diaSemana: string;
  lancamentos: Lancamento[];
  totalPagar: number;
  totalReceber: number;
  isHoje: boolean;
  isPassado: boolean;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CalendarModule, CardModule, TagModule,
    ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    DropdownModule, ToastModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-header">
      <h2>Calendário - Contas a Pagar</h2>
      <div class="header-actions">
        <p-button icon="pi pi-chevron-left" [rounded]="true" [text]="true" (onClick)="mesAnterior()" />
        <span class="mes-label">{{ mesAnoLabel() }}</span>
        <p-button icon="pi pi-chevron-right" [rounded]="true" [text]="true" (onClick)="mesSeguinte()" />
        <p-button icon="pi pi-whatsapp" label="Enviar Resumo" severity="success" (onClick)="compartilharResumoMes()" styleClass="ml-3" />
        <p-button label="Importar CSV" icon="pi pi-upload" severity="secondary" (onClick)="importDialogVisible = true" />
        <p-button label="Novo Lançamento" icon="pi pi-plus" (onClick)="openNew()" />
      </div>
    </div>

    <!-- Resumo do Mês -->
    <div class="resumo-grid">
      <div class="resumo-card pagar">
        <i class="pi pi-arrow-down"></i>
        <div>
          <span>Total a Pagar no Mês</span>
          <strong>{{ totalPagarMes() | currency:'BRL' }}</strong>
          <small>{{ qtdPagarMes() }} pendentes</small>
        </div>
      </div>
      <div class="resumo-card receber">
        <i class="pi pi-arrow-up"></i>
        <div>
          <span>Total a Receber no Mês</span>
          <strong>{{ totalReceberMes() | currency:'BRL' }}</strong>
          <small>{{ qtdReceberMes() }} pendentes</small>
        </div>
      </div>
      <div class="resumo-card vencido">
        <i class="pi pi-exclamation-triangle"></i>
        <div>
          <span>Vencidos</span>
          <strong>{{ totalVencido() | currency:'BRL' }}</strong>
          <small>{{ qtdVencido() }} atrasados</small>
        </div>
      </div>
    </div>

    <!-- Agenda diária -->
    <div class="agenda">
      @for (dia of diasAgenda(); track dia.data) {
        @if (dia.lancamentos.length > 0) {
          <div class="dia-card" [class.hoje]="dia.isHoje" [class.passado]="dia.isPassado">
            <div class="dia-header">
              <div class="dia-info">
                <span class="dia-numero">{{ dia.dataFormatada }}</span>
                <span class="dia-semana">{{ dia.diaSemana }}</span>
              </div>
              <div class="dia-totais">
                @if (dia.totalPagar > 0) {
                  <span class="total-pagar">-{{ dia.totalPagar | currency:'BRL' }}</span>
                }
                @if (dia.totalReceber > 0) {
                  <span class="total-receber">+{{ dia.totalReceber | currency:'BRL' }}</span>
                }
                <p-button
                  icon="pi pi-whatsapp"
                  [rounded]="true"
                  [text]="true"
                  severity="success"
                  size="small"
                  (onClick)="compartilharResumoDia(dia)"
                />
              </div>
            </div>

            <div class="dia-lancamentos">
              @for (lanc of dia.lancamentos; track lanc.id) {
                <div class="lanc-item" [class.vencido]="dia.isPassado && lanc.status === 'pendente'">
                  <div class="lanc-info">
                    <div class="lanc-tipo">
                      <i [class]="lanc.tipo === 'receita' ? 'pi pi-arrow-up' : 'pi pi-arrow-down'"
                         [style.color]="lanc.tipo === 'receita' ? '#22c55e' : '#ef4444'"></i>
                    </div>
                    <div>
                      <strong>{{ lanc.descricao }}</strong>
                      @if (lanc.fornecedor_cliente) {
                        <small>{{ lanc.fornecedor_cliente }}</small>
                      }
                    </div>
                  </div>
                  <div class="lanc-right">
                    <span [class]="lanc.tipo === 'receita' ? 'valor-pos' : 'valor-neg'">
                      {{ lanc.valor | currency:'BRL' }}
                    </span>
                    <p-tag [value]="lanc.status" [severity]="getStatusSeverity(lanc.status)" />
                    @if (lanc.status === 'pendente') {
                      <p-button
                        [icon]="lanc.tipo === 'receita' ? 'pi pi-check' : 'pi pi-money-bill'"
                        [rounded]="true"
                        [text]="true"
                        severity="success"
                        size="small"
                        (onClick)="confirmarPagamento(lanc)"
                      />
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (diasAgenda().length === 0 || nenhumLancamento()) {
        <div class="empty-state">
          <i class="pi pi-calendar" style="font-size: 3rem; color: var(--text-color-secondary)"></i>
          <p>Nenhuma conta a pagar ou receber neste mês</p>
        </div>
      }
    </div>

    <!-- Dialog Novo Lançamento -->
    <p-dialog
      [(visible)]="dialogVisible"
      header="Novo Lançamento"
      [modal]="true"
      [style]="{ width: '550px' }"
    >
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
          <label>Vencimento</label>
          <p-calendar [(ngModel)]="formDataVencimento" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" />
        </div>
        <div class="field">
          <label>Categoria</label>
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
      </div>
      <div class="field">
        <label>Fornecedor / Cliente</label>
        <input pInputText [(ngModel)]="form.fornecedor_cliente" class="w-full" />
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="dialogVisible = false" />
        <p-button label="Salvar" icon="pi pi-check" (onClick)="save()" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <!-- Dialog Importação CSV -->
    <p-dialog
      [(visible)]="importDialogVisible"
      header="Importar Contas a Pagar (CSV)"
      [modal]="true"
      [style]="{ width: '600px' }"
    >
      <p style="margin-bottom: 1rem">
        O arquivo CSV deve conter as colunas separadas por <strong>ponto-e-vírgula (;)</strong>:
      </p>
      <p style="margin-bottom: 1rem; font-family: monospace; background: var(--surface-ground); padding: 0.75rem; border-radius: 6px;">
        data;descricao;tipo;valor;fornecedor
      </p>
      <p style="margin-bottom: 1rem; color: var(--text-color-secondary); font-size: 0.9rem;">
        Data: DD/MM/AAAA | Tipo: receita ou despesa | Valor: use vírgula para decimais (ex: 1500,00)
      </p>

      <input
        type="file"
        accept=".csv,.ofx"
        (change)="onFileSelect($event)"
      />

      @if (importPreview().length > 0) {
        <div style="margin-top: 1rem; padding: 0.75rem; background: var(--surface-ground); border-radius: 6px;">
          <strong>{{ importPreview().length }}</strong> lançamentos encontrados no arquivo
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
    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
    }
    .page-header h2 { margin: 0; }
    .header-actions { display: flex; align-items: center; gap: 0.5rem; }
    .mes-label { font-size: 1.1rem; font-weight: 600; min-width: 160px; text-align: center; }

    .resumo-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;
    }

    .resumo-card {
      display: flex; align-items: center; gap: 1rem; padding: 1.25rem;
      border-radius: 10px; color: white;
    }
    .resumo-card i { font-size: 2rem; opacity: 0.8; }
    .resumo-card span { font-size: 0.85rem; opacity: 0.9; }
    .resumo-card strong { font-size: 1.3rem; display: block; }
    .resumo-card small { font-size: 0.75rem; opacity: 0.7; }
    .resumo-card.pagar { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .resumo-card.receber { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .resumo-card.vencido { background: linear-gradient(135deg, #f59e0b, #d97706); }

    .agenda { display: flex; flex-direction: column; gap: 1rem; }

    .dia-card {
      background: var(--surface-card); border-radius: 8px;
      border: 1px solid var(--surface-border); overflow: hidden;
    }
    .dia-card.hoje { border-color: #3b82f6; border-width: 2px; }
    .dia-card.passado { opacity: 0.85; }

    .dia-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; background: var(--surface-50);
      border-bottom: 1px solid var(--surface-border);
    }
    .dia-info { display: flex; align-items: center; gap: 0.75rem; }
    .dia-numero { font-weight: 700; font-size: 1rem; }
    .dia-semana { color: var(--text-color-secondary); font-size: 0.85rem; }
    .dia-totais { display: flex; gap: 1rem; }
    .total-pagar { color: #ef4444; font-weight: 600; }
    .total-receber { color: #22c55e; font-weight: 600; }

    .dia-lancamentos { padding: 0.5rem; }

    .lanc-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem; border-radius: 6px; transition: background 0.2s;
    }
    .lanc-item:hover { background: var(--surface-ground); }
    .lanc-item.vencido { background: #fef2f2; }

    .lanc-info { display: flex; align-items: center; gap: 0.75rem; }
    .lanc-tipo i { font-size: 1.1rem; }
    .lanc-info strong { display: block; font-size: 0.9rem; }
    .lanc-info small { color: var(--text-color-secondary); font-size: 0.8rem; }

    .lanc-right { display: flex; align-items: center; gap: 0.75rem; }
    .valor-pos { color: #22c55e; font-weight: 600; }
    .valor-neg { color: #ef4444; font-weight: 600; }

    .empty-state {
      text-align: center; padding: 3rem;
      color: var(--text-color-secondary);
    }
    .empty-state p { margin-top: 1rem; }

    .field { margin-bottom: 1rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
    .field-row { display: flex; gap: 1rem; }
    .field-row .field { flex: 1; }
  `,
})
export class CalendarioComponent implements OnInit {
  private lancamentos = signal<Lancamento[]>([]);
  private mesAtual = signal(new Date().getMonth());
  private anoAtual = signal(new Date().getFullYear());

  private diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  private nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  mesAnoLabel = computed(() => `${this.nomesMeses[this.mesAtual()]} ${this.anoAtual()}`);

  diasAgenda = computed(() => {
    const lancs = this.lancamentos();
    const hoje = new Date().toISOString().split('T')[0];
    const diasMap = new Map<string, Lancamento[]>();

    for (const l of lancs) {
      const data = l.data_vencimento;
      if (!diasMap.has(data)) diasMap.set(data, []);
      diasMap.get(data)!.push(l);
    }

    const dias: DiaAgenda[] = [];
    const sortedDates = Array.from(diasMap.keys()).sort();

    for (const data of sortedDates) {
      const d = new Date(data + 'T12:00:00');
      const lancsDia = diasMap.get(data)!;

      dias.push({
        data,
        dataFormatada: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        diaSemana: this.diasSemana[d.getDay()],
        lancamentos: lancsDia,
        totalPagar: lancsDia.filter((l) => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0),
        totalReceber: lancsDia.filter((l) => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0),
        isHoje: data === hoje,
        isPassado: data < hoje,
      });
    }

    return dias;
  });

  nenhumLancamento = computed(() => this.lancamentos().length === 0);

  totalPagarMes = computed(() =>
    this.lancamentos().filter((l) => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0),
  );
  qtdPagarMes = computed(() =>
    this.lancamentos().filter((l) => l.tipo === 'despesa' && l.status === 'pendente').length,
  );
  totalReceberMes = computed(() =>
    this.lancamentos().filter((l) => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0),
  );
  qtdReceberMes = computed(() =>
    this.lancamentos().filter((l) => l.tipo === 'receita' && l.status === 'pendente').length,
  );
  totalVencido = computed(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return this.lancamentos().filter((l) => l.status === 'pendente' && l.data_vencimento < hoje).reduce((s, l) => s + Number(l.valor), 0);
  });
  qtdVencido = computed(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return this.lancamentos().filter((l) => l.status === 'pendente' && l.data_vencimento < hoje).length;
  });

  dialogVisible = false;
  importDialogVisible = false;
  saving = signal(false);
  importing = signal(false);
  importPreview = signal<Partial<Lancamento>[]>([]);
  form: Partial<Lancamento> = {};
  formDataVencimento: Date | null = null;

  tiposOptions = [
    { label: 'Despesa (Pagar)', value: 'despesa' },
    { label: 'Receita (Receber)', value: 'receita' },
  ];

  planoContasOptions = signal<{ label: string; value: string }[]>([]);

  constructor(
    private supabase: SupabaseService,
    private empresaService: EmpresaService,
    private lancamentoService: LancamentoService,
    private planoContasService: PlanoContasService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await Promise.all([
      this.loadLancamentos(),
      this.planoContasService.loadContas(),
    ]);

    this.planoContasOptions.set(
      this.planoContasService.contas().map((c) => ({
        label: `${c.codigo} - ${c.descricao}`,
        value: c.id,
      })),
    );
  }

  async loadLancamentos() {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return;

    const mes = this.mesAtual() + 1;
    const ano = this.anoAtual();
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

    const { data } = await this.supabase.supabase
      .from('lancamentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .neq('status', 'cancelado')
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .order('data_vencimento');

    this.lancamentos.set((data as Lancamento[]) ?? []);
  }

  mesAnterior() {
    if (this.mesAtual() === 0) {
      this.mesAtual.set(11);
      this.anoAtual.set(this.anoAtual() - 1);
    } else {
      this.mesAtual.set(this.mesAtual() - 1);
    }
    this.loadLancamentos();
  }

  mesSeguinte() {
    if (this.mesAtual() === 11) {
      this.mesAtual.set(0);
      this.anoAtual.set(this.anoAtual() + 1);
    } else {
      this.mesAtual.set(this.mesAtual() + 1);
    }
    this.loadLancamentos();
  }

  openNew() {
    this.form = { tipo: 'despesa', status: 'pendente' };
    this.formDataVencimento = null;
    this.dialogVisible = true;
  }

  async save() {
    if (!this.form.descricao || !this.form.tipo || !this.form.valor || !this.formDataVencimento || !this.form.plano_conta_id) {
      this.messageService.add({ severity: 'warn', summary: 'Preencha todos os campos obrigatórios' });
      return;
    }

    this.form.data_vencimento = this.formDataVencimento.toISOString().split('T')[0];
    this.saving.set(true);

    await this.lancamentoService.create(this.form);
    await this.loadLancamentos();
    this.messageService.add({ severity: 'success', summary: 'Lançamento criado' });

    this.saving.set(false);
    this.dialogVisible = false;
  }

  confirmarPagamento(lanc: Lancamento) {
    const action = lanc.tipo === 'receita' ? 'receber' : 'pagar';
    this.confirmationService.confirm({
      message: `Confirmar ${action} "${lanc.descricao}" no valor de R$ ${Number(lanc.valor).toFixed(2)}?`,
      header: 'Confirmar',
      icon: 'pi pi-check',
      accept: async () => {
        const status: StatusLancamento = lanc.tipo === 'receita' ? 'recebido' : 'pago';
        await this.lancamentoService.updateStatus(lanc.id, status, new Date().toISOString().split('T')[0]);
        await this.loadLancamentos();
        this.messageService.add({ severity: 'success', summary: `Lançamento ${status}` });
      },
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith('.ofx')) {
        this.parseOfx(content);
      } else {
        this.parseCsv(content);
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

      const [data, descricao, tipo, valorStr, fornecedor] = cols;
      const valor = parseFloat(valorStr.replace('.', '').replace(',', '.'));
      if (isNaN(valor)) continue;

      const parts = data.split('/');
      const dataFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : data;

      rows.push({
        descricao,
        tipo: (tipo?.toLowerCase() === 'receita' ? 'receita' : 'despesa') as any,
        valor: Math.abs(valor),
        data_vencimento: dataFormatted,
        status: 'pendente' as any,
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

      rows.push({
        descricao: memo,
        tipo: (amount >= 0 ? 'receita' : 'despesa') as any,
        valor: Math.abs(amount),
        data_vencimento: `${dtPosted.substring(0, 4)}-${dtPosted.substring(4, 6)}-${dtPosted.substring(6, 8)}`,
        status: 'pendente' as any,
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

    const rowsWithPlano = rows.map((r) => ({ ...r, plano_conta_id: defaultPlano.id }));
    const count = await this.lancamentoService.importFromCsv(rowsWithPlano);
    await this.loadLancamentos();

    this.messageService.add({ severity: 'success', summary: `${count} lançamentos importados` });
    this.importing.set(false);
    this.importPreview.set([]);
    this.importDialogVisible = false;
  }

  compartilharResumoMes() {
    const empresa = this.empresaService.empresaAtiva();
    const nome = empresa?.nome_fantasia || empresa?.razao_social || '';
    const mes = this.mesAnoLabel();

    let msg = `📊 *Resumo Financeiro - ${nome}*\n`;
    msg += `📅 ${mes}\n\n`;

    if (this.qtdPagarMes() > 0) {
      msg += `🔴 *Contas a Pagar:* R$ ${this.totalPagarMes().toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${this.qtdPagarMes()} pendentes)\n`;
    }
    if (this.qtdReceberMes() > 0) {
      msg += `🟢 *Contas a Receber:* R$ ${this.totalReceberMes().toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${this.qtdReceberMes()} pendentes)\n`;
    }
    if (this.qtdVencido() > 0) {
      msg += `⚠️ *Vencidos:* R$ ${this.totalVencido().toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${this.qtdVencido()} atrasados)\n`;
    }

    msg += `\n📋 *Próximos vencimentos:*\n`;
    const pendentes = this.lancamentos()
      .filter((l) => l.status === 'pendente')
      .slice(0, 10);

    for (const l of pendentes) {
      const d = new Date(l.data_vencimento + 'T12:00:00');
      const dataFmt = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const icon = l.tipo === 'receita' ? '🟢' : '🔴';
      msg += `${icon} ${dataFmt} - ${l.descricao} - R$ ${Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      if (l.fornecedor_cliente) msg += ` (${l.fornecedor_cliente})`;
      msg += `\n`;
    }

    if (pendentes.length === 0) {
      msg += `✅ Nenhum vencimento pendente\n`;
    }

    msg += `\n_Enviado via BPO Financeiro_`;
    this.openWhatsApp(msg);
  }

  compartilharResumoDia(dia: DiaAgenda) {
    const empresa = this.empresaService.empresaAtiva();
    const nome = empresa?.nome_fantasia || empresa?.razao_social || '';

    let msg = `📅 *Agenda Financeira - ${dia.dataFormatada} (${dia.diaSemana})*\n`;
    msg += `🏢 ${nome}\n\n`;

    for (const l of dia.lancamentos) {
      const icon = l.tipo === 'receita' ? '🟢' : '🔴';
      const statusIcon = l.status === 'pendente' ? '⏳' : '✅';
      msg += `${icon} ${l.descricao}\n`;
      msg += `   💰 R$ ${Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      if (l.fornecedor_cliente) msg += ` | ${l.fornecedor_cliente}`;
      msg += ` | ${statusIcon} ${l.status}\n`;
    }

    if (dia.totalPagar > 0) {
      msg += `\n🔴 Total a pagar: R$ ${dia.totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    if (dia.totalReceber > 0) {
      msg += `\n🟢 Total a receber: R$ ${dia.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    msg += `\n\n_Enviado via BPO Financeiro_`;
    this.openWhatsApp(msg);
  }

  private openWhatsApp(msg: string) {
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  getStatusSeverity(status: StatusLancamento): 'success' | 'warn' | 'danger' | 'info' {
    const map: Record<StatusLancamento, 'success' | 'warn' | 'danger' | 'info'> = {
      pendente: 'warn', pago: 'success', recebido: 'success', cancelado: 'danger',
    };
    return map[status];
  }
}
