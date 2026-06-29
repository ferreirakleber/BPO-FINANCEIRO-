import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { EmpresaService } from '../../core/services/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Lancamento, StatusLancamento, TipoLancamento } from '../../core/models/lancamento.model';
import { ContaBancaria } from '../../core/models/conta-bancaria.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, ChartModule, TableModule, TagModule],
  template: `
    <h2>Dashboard</h2>
    @if (empresaService.empresaAtiva(); as empresa) {
      <p style="margin-bottom: 1.5rem; color: var(--text-color-secondary)">
        {{ empresa.nome_fantasia || empresa.razao_social }}
      </p>
    }

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <i class="pi pi-wallet"></i>
        <div>
          <span>Saldo Total</span>
          <strong>{{ saldoTotal() | currency:'BRL' }}</strong>
        </div>
      </div>
      <div class="kpi-card red">
        <i class="pi pi-arrow-down"></i>
        <div>
          <span>Contas a Pagar</span>
          <strong>{{ contasAPagar() | currency:'BRL' }}</strong>
          <small>{{ qtdAPagar() }} pendentes</small>
        </div>
      </div>
      <div class="kpi-card green">
        <i class="pi pi-arrow-up"></i>
        <div>
          <span>Contas a Receber</span>
          <strong>{{ contasAReceber() | currency:'BRL' }}</strong>
          <small>{{ qtdAReceber() }} pendentes</small>
        </div>
      </div>
      <div class="kpi-card" [class]="lucroLiquido() >= 0 ? 'green' : 'red'">
        <i class="pi pi-chart-line"></i>
        <div>
          <span>Lucro Líquido (mês)</span>
          <strong>{{ lucroLiquido() | currency:'BRL' }}</strong>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <!-- Evolução do Caixa -->
      <p-card header="Evolução do Caixa (6 meses)">
        @if (evolucaoCaixaData()) {
          <p-chart type="line" [data]="evolucaoCaixaData()!" [options]="lineChartOptions" height="280px" />
        }
      </p-card>

      <!-- Receitas vs Despesas -->
      <p-card header="Receitas vs Despesas (6 meses)">
        @if (receitaDespesaData()) {
          <p-chart type="bar" [data]="receitaDespesaData()!" [options]="barChartOptions" height="280px" />
        }
      </p-card>
    </div>

    <div class="bottom-grid">
      <!-- Contas Bancárias -->
      <p-card header="Contas Bancárias">
        @if (contasBancarias().length > 0) {
          <div class="conta-list">
            @for (conta of contasBancarias(); track conta.id) {
              <div class="conta-item">
                <div>
                  <strong>{{ conta.descricao }}</strong>
                  <small>{{ conta.banco }} | Ag: {{ conta.agencia }} | Cc: {{ conta.conta }}</small>
                </div>
                <span [class]="conta.saldo_atual >= 0 ? 'saldo-pos' : 'saldo-neg'">
                  {{ conta.saldo_atual | currency:'BRL' }}
                </span>
              </div>
            }
          </div>
        } @else {
          <p class="empty">Nenhuma conta bancária cadastrada</p>
        }
      </p-card>

      <!-- Últimos Lançamentos -->
      <p-card header="Últimos Lançamentos">
        @if (ultimosLancamentos().length > 0) {
          <p-table [value]="ultimosLancamentos()" styleClass="p-datatable-sm">
            <ng-template pTemplate="body" let-l>
              <tr>
                <td>{{ l.data_vencimento | date:'dd/MM' }}</td>
                <td>{{ l.descricao }}</td>
                <td>
                  <p-tag [value]="l.tipo" [severity]="l.tipo === 'receita' ? 'success' : 'danger'" />
                </td>
                <td [class]="l.tipo === 'receita' ? 'saldo-pos' : 'saldo-neg'" style="text-align: right">
                  {{ l.valor | currency:'BRL' }}
                </td>
                <td>
                  <p-tag [value]="l.status" [severity]="getStatusSeverity(l.status)" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="empty">Nenhum lançamento</td></tr>
            </ng-template>
          </p-table>
        } @else {
          <p class="empty">Nenhum lançamento registrado</p>
        }
      </p-card>
    </div>

    <!-- Vencimentos Próximos -->
    <p-card header="Vencimentos nos Próximos 7 Dias" styleClass="mt-card">
      @if (vencimentosProximos().length > 0) {
        <p-table [value]="vencimentosProximos()" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header">
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Fornecedor/Cliente</th>
              <th>Tipo</th>
              <th style="text-align: right">Valor</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-l>
            <tr>
              <td>{{ l.data_vencimento | date:'dd/MM/yyyy' }}</td>
              <td>{{ l.descricao }}</td>
              <td>{{ l.fornecedor_cliente || '-' }}</td>
              <td><p-tag [value]="l.tipo" [severity]="l.tipo === 'receita' ? 'success' : 'danger'" /></td>
              <td [class]="l.tipo === 'receita' ? 'saldo-pos' : 'saldo-neg'" style="text-align: right">
                {{ l.valor | currency:'BRL' }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      } @else {
        <p class="empty">Nenhum vencimento nos próximos 7 dias</p>
      }
    </p-card>
  `,
  styles: `
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      border-radius: 10px;
      color: white;
    }

    .kpi-card i { font-size: 2rem; opacity: 0.8; }
    .kpi-card span { font-size: 0.85rem; opacity: 0.9; }
    .kpi-card strong { font-size: 1.4rem; display: block; }
    .kpi-card small { font-size: 0.75rem; opacity: 0.7; }

    .kpi-card.blue { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .kpi-card.green { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .kpi-card.red { background: linear-gradient(135deg, #ef4444, #dc2626); }

    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    :host ::ng-deep .mt-card { margin-top: 0; }

    .conta-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .conta-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem; background: var(--surface-ground); border-radius: 6px;
    }
    .conta-item strong { display: block; }
    .conta-item small { color: var(--text-color-secondary); font-size: 0.8rem; }

    .saldo-pos { color: #22c55e; font-weight: 600; }
    .saldo-neg { color: #ef4444; font-weight: 600; }

    .empty { text-align: center; color: var(--text-color-secondary); padding: 1rem; font-style: italic; }
  `,
})
export class DashboardComponent implements OnInit {
  contasBancarias = signal<ContaBancaria[]>([]);
  ultimosLancamentos = signal<Lancamento[]>([]);
  vencimentosProximos = signal<Lancamento[]>([]);
  saldoTotal = signal(0);
  contasAPagar = signal(0);
  contasAReceber = signal(0);
  qtdAPagar = signal(0);
  qtdAReceber = signal(0);
  lucroLiquido = signal(0);
  evolucaoCaixaData = signal<any>(null);
  receitaDespesaData = signal<any>(null);

  lineChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { ticks: { callback: (v: number) => `R$ ${(v / 1000).toFixed(0)}k` } } },
  };

  barChartOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const } },
    scales: { y: { ticks: { callback: (v: number) => `R$ ${(v / 1000).toFixed(0)}k` } } },
  };

  constructor(
    public empresaService: EmpresaService,
    public authService: AuthService,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit() {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return;

    await Promise.all([
      this.loadContasBancarias(empresaId),
      this.loadUltimosLancamentos(empresaId),
      this.loadVencimentos(empresaId),
      this.loadContasAPagarReceber(empresaId),
      this.loadLucroMes(empresaId),
      this.loadEvolucao(empresaId),
    ]);
  }

  private async loadContasBancarias(empresaId: string) {
    const { data } = await this.supabase.supabase
      .from('contas_bancarias').select('*')
      .eq('empresa_id', empresaId).eq('ativa', true);

    const contas = (data as ContaBancaria[]) ?? [];
    this.contasBancarias.set(contas);
    this.saldoTotal.set(contas.reduce((s, c) => s + Number(c.saldo_atual), 0));
  }

  private async loadUltimosLancamentos(empresaId: string) {
    const { data } = await this.supabase.supabase
      .from('lancamentos').select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }).limit(8);

    this.ultimosLancamentos.set((data as Lancamento[]) ?? []);
  }

  private async loadVencimentos(empresaId: string) {
    const hoje = new Date().toISOString().split('T')[0];
    const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const { data } = await this.supabase.supabase
      .from('lancamentos').select('*')
      .eq('empresa_id', empresaId).eq('status', 'pendente')
      .gte('data_vencimento', hoje).lte('data_vencimento', em7dias)
      .order('data_vencimento');

    this.vencimentosProximos.set((data as Lancamento[]) ?? []);
  }

  private async loadContasAPagarReceber(empresaId: string) {
    const { data: pagar } = await this.supabase.supabase
      .from('lancamentos').select('valor')
      .eq('empresa_id', empresaId).eq('tipo', 'despesa').eq('status', 'pendente');

    const { data: receber } = await this.supabase.supabase
      .from('lancamentos').select('valor')
      .eq('empresa_id', empresaId).eq('tipo', 'receita').eq('status', 'pendente');

    const pagarList = (pagar ?? []) as { valor: number }[];
    const receberList = (receber ?? []) as { valor: number }[];

    this.contasAPagar.set(pagarList.reduce((s, l) => s + Number(l.valor), 0));
    this.qtdAPagar.set(pagarList.length);
    this.contasAReceber.set(receberList.reduce((s, l) => s + Number(l.valor), 0));
    this.qtdAReceber.set(receberList.length);
  }

  private async loadLucroMes(empresaId: string) {
    const now = new Date();
    const inicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const fim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    const { data } = await this.supabase.supabase
      .from('lancamentos').select('valor, tipo')
      .eq('empresa_id', empresaId)
      .in('status', ['pago', 'recebido'])
      .gte('data_vencimento', inicio).lte('data_vencimento', fim);

    const lancamentos = (data ?? []) as { valor: number; tipo: string }[];
    const receitas = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const despesas = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
    this.lucroLiquido.set(receitas - despesas);
  }

  private async loadEvolucao(empresaId: string) {
    const meses: string[] = [];
    const labels: string[] = [];
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const ano = d.getFullYear();
      const mes = d.getMonth() + 1;
      meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
      labels.push(`${nomesMeses[mes - 1]}/${String(ano).slice(2)}`);
    }

    const receitasMes: number[] = [];
    const despesasMes: number[] = [];
    const saldoAcumulado: number[] = [];
    let acumulado = 0;

    for (const m of meses) {
      const inicio = `${m}-01`;
      const partes = m.split('-');
      const ultimoDia = new Date(Number(partes[0]), Number(partes[1]), 0).getDate();
      const fim = `${m}-${ultimoDia}`;

      const { data } = await this.supabase.supabase
        .from('lancamentos').select('valor, tipo')
        .eq('empresa_id', empresaId)
        .in('status', ['pago', 'recebido'])
        .gte('data_vencimento', inicio).lte('data_vencimento', fim);

      const lancs = (data ?? []) as { valor: number; tipo: string }[];
      const rec = lancs.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
      const desp = lancs.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
      receitasMes.push(rec);
      despesasMes.push(desp);
      acumulado += rec - desp;
      saldoAcumulado.push(acumulado);
    }

    this.evolucaoCaixaData.set({
      labels,
      datasets: [{
        label: 'Saldo Acumulado',
        data: saldoAcumulado,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.3,
      }],
    });

    this.receitaDespesaData.set({
      labels,
      datasets: [
        { label: 'Receitas', data: receitasMes, backgroundColor: '#22c55e' },
        { label: 'Despesas', data: despesasMes, backgroundColor: '#ef4444' },
      ],
    });
  }

  getStatusSeverity(status: StatusLancamento): 'success' | 'warn' | 'danger' | 'info' {
    const map: Record<StatusLancamento, 'success' | 'warn' | 'danger' | 'info'> = {
      pendente: 'warn', pago: 'success', recebido: 'success', cancelado: 'danger',
    };
    return map[status];
  }
}
