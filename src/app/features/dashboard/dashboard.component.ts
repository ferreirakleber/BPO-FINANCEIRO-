import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { EmpresaService } from '../../core/services/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Lancamento, StatusLancamento } from '../../core/models/lancamento.model';
import { ContaBancaria } from '../../core/models/conta-bancaria.model';

interface DespesaRanking {
  descricao: string;
  valor: number;
  percentual: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardModule, ChartModule, TableModule, TagModule, DropdownModule],
  template: `
    <div class="dash-header">
      <div>
        <h2>Dashboard</h2>
        @if (empresaService.empresaAtiva(); as empresa) {
          <p class="subtitle">{{ empresa.nome_fantasia || empresa.razao_social }}</p>
        }
      </div>
      <div class="period-filter">
        <p-dropdown [(ngModel)]="mesSelecionado" [options]="mesesOptions" optionLabel="label" optionValue="value" (onChange)="reload()" />
        <p-dropdown [(ngModel)]="anoSelecionado" [options]="anosOptions" optionLabel="label" optionValue="value" (onChange)="reload()" />
      </div>
    </div>

    <!-- KPIs Row 1 -->
    <div class="kpi-grid">
      <div class="kpi-card blue" (click)="router.navigate(['/contas-bancarias'])">
        <i class="pi pi-wallet"></i>
        <div>
          <span>Saldo Total</span>
          <strong>{{ saldoTotal() | currency:'BRL' }}</strong>
        </div>
      </div>
      <div class="kpi-card red" (click)="router.navigate(['/calendario'])">
        <i class="pi pi-arrow-down"></i>
        <div>
          <span>Contas a Pagar</span>
          <strong>{{ contasAPagar() | currency:'BRL' }}</strong>
          <small>{{ qtdAPagar() }} pendentes</small>
        </div>
      </div>
      <div class="kpi-card green" (click)="router.navigate(['/lancamentos'])">
        <i class="pi pi-arrow-up"></i>
        <div>
          <span>Contas a Receber</span>
          <strong>{{ contasAReceber() | currency:'BRL' }}</strong>
          <small>{{ qtdAReceber() }} pendentes</small>
        </div>
      </div>
      <div class="kpi-card" [class]="lucroLiquido() >= 0 ? 'green' : 'red'" (click)="router.navigate(['/dre'])">
        <i class="pi pi-chart-line"></i>
        <div>
          <span>Lucro Líquido (mês)</span>
          <strong>{{ lucroLiquido() | currency:'BRL' }}</strong>
        </div>
      </div>
    </div>

    <!-- KPIs Row 2 -->
    <div class="kpi-grid small">
      <div class="kpi-mini">
        <span>Margem Líquida</span>
        <strong [class]="margemLiquida() >= 0 ? 'pos' : 'neg'">{{ margemLiquida() | number:'1.1-1' }}%</strong>
      </div>
      <div class="kpi-mini">
        <span>Saldo Projetado</span>
        <strong [class]="saldoProjetado() >= 0 ? 'pos' : 'neg'">{{ saldoProjetado() | currency:'BRL' }}</strong>
      </div>
      <div class="kpi-mini">
        <span>Receita do Mês</span>
        <strong class="pos">{{ receitaMes() | currency:'BRL' }}</strong>
      </div>
      <div class="kpi-mini">
        <span>Despesa do Mês</span>
        <strong class="neg">{{ despesaMes() | currency:'BRL' }}</strong>
      </div>
      @if (qtdVencido() > 0) {
        <div class="kpi-mini vencido" (click)="router.navigate(['/calendario'])">
          <span>Vencidos</span>
          <strong>{{ qtdVencido() }} | {{ totalVencido() | currency:'BRL' }}</strong>
        </div>
      }
    </div>

    <div class="charts-grid">
      <p-card header="Evolução do Caixa (6 meses)">
        @if (evolucaoCaixaData()) {
          <p-chart type="line" [data]="evolucaoCaixaData()!" [options]="lineChartOptions" height="280px" />
        }
      </p-card>
      <p-card header="Receitas vs Despesas (6 meses)">
        @if (receitaDespesaData()) {
          <p-chart type="bar" [data]="receitaDespesaData()!" [options]="barChartOptions" height="280px" />
        }
      </p-card>
    </div>

    <div class="bottom-grid">
      <!-- Top 5 Despesas -->
      <p-card header="Top 5 Maiores Despesas do Mês">
        @if (topDespesas().length > 0) {
          <div class="ranking-list">
            @for (item of topDespesas(); track item.descricao; let i = $index) {
              <div class="ranking-item">
                <div class="ranking-pos">{{ i + 1 }}º</div>
                <div class="ranking-info">
                  <strong>{{ item.descricao }}</strong>
                  <div class="ranking-bar">
                    <div class="ranking-bar-fill" [style.width.%]="item.percentual"></div>
                  </div>
                </div>
                <div class="ranking-valor">{{ item.valor | currency:'BRL' }}</div>
              </div>
            }
          </div>
        } @else {
          <p class="empty">Nenhuma despesa no período</p>
        }
      </p-card>

      <!-- Composição Despesas -->
      <p-card header="Composição das Despesas">
        @if (composicaoDespesasData()) {
          <p-chart type="doughnut" [data]="composicaoDespesasData()!" [options]="doughnutOptions" height="280px" />
        } @else {
          <p class="empty">Nenhuma despesa no período</p>
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
                <td>
                  {{ l.descricao | slice:0:30 }}
                  @if (l.descricao.length > 30) { ... }
                </td>
                <td>
                  <p-tag [value]="l.tipo" [severity]="l.tipo === 'receita' ? 'success' : 'danger'" />
                </td>
                <td [class]="l.tipo === 'receita' ? 'saldo-pos' : 'saldo-neg'" style="text-align: right">
                  {{ l.valor | currency:'BRL' }}
                </td>
              </tr>
            </ng-template>
          </p-table>
        } @else {
          <p class="empty">Nenhum lançamento</p>
        }
      </p-card>
    </div>

    <!-- Vencimentos Próximos -->
    <p-card header="Vencimentos nos Próximos 7 Dias">
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
    .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    .dash-header h2 { margin: 0; }
    .subtitle { color: var(--text-color-secondary); margin: 0.25rem 0 0; }
    .period-filter { display: flex; gap: 0.5rem; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .kpi-grid.small { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin-bottom: 1.5rem; }

    .kpi-card {
      display: flex; align-items: center; gap: 1rem; padding: 1.25rem;
      border-radius: 10px; color: white; cursor: pointer; transition: transform 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-card i { font-size: 2rem; opacity: 0.8; }
    .kpi-card span { font-size: 0.85rem; opacity: 0.9; }
    .kpi-card strong { font-size: 1.4rem; display: block; }
    .kpi-card small { font-size: 0.75rem; opacity: 0.7; }
    .kpi-card.blue { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .kpi-card.green { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .kpi-card.red { background: linear-gradient(135deg, #ef4444, #dc2626); }

    .kpi-mini {
      background: var(--surface-card); border: 1px solid var(--surface-border);
      border-radius: 8px; padding: 0.75rem 1rem; display: flex; flex-direction: column;
    }
    .kpi-mini span { font-size: 0.8rem; color: var(--text-color-secondary); }
    .kpi-mini strong { font-size: 1.1rem; margin-top: 0.25rem; }
    .kpi-mini .pos { color: #22c55e; }
    .kpi-mini .neg { color: #ef4444; }
    .kpi-mini.vencido { background: #fef2f2; border-color: #fecaca; cursor: pointer; }
    .kpi-mini.vencido strong { color: #ef4444; }

    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }

    .ranking-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .ranking-item { display: flex; align-items: center; gap: 0.75rem; }
    .ranking-pos { font-weight: 700; color: var(--primary-color); font-size: 1.1rem; min-width: 30px; }
    .ranking-info { flex: 1; }
    .ranking-info strong { font-size: 0.9rem; display: block; margin-bottom: 0.25rem; }
    .ranking-bar { height: 6px; background: var(--surface-200); border-radius: 3px; }
    .ranking-bar-fill { height: 100%; background: #ef4444; border-radius: 3px; transition: width 0.3s; }
    .ranking-valor { font-weight: 600; color: #ef4444; min-width: 100px; text-align: right; }

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
  receitaMes = signal(0);
  despesaMes = signal(0);
  margemLiquida = signal(0);
  saldoProjetado = signal(0);
  totalVencido = signal(0);
  qtdVencido = signal(0);
  topDespesas = signal<DespesaRanking[]>([]);
  evolucaoCaixaData = signal<any>(null);
  receitaDespesaData = signal<any>(null);
  composicaoDespesasData = signal<any>(null);

  mesSelecionado = new Date().getMonth() + 1;
  anoSelecionado = new Date().getFullYear();

  mesesOptions = [
    { label: 'Jan', value: 1 }, { label: 'Fev', value: 2 }, { label: 'Mar', value: 3 },
    { label: 'Abr', value: 4 }, { label: 'Mai', value: 5 }, { label: 'Jun', value: 6 },
    { label: 'Jul', value: 7 }, { label: 'Ago', value: 8 }, { label: 'Set', value: 9 },
    { label: 'Out', value: 10 }, { label: 'Nov', value: 11 }, { label: 'Dez', value: 12 },
  ];

  anosOptions = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { label: y.toString(), value: y };
  });

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

  doughnutOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12 } } },
  };

  constructor(
    public empresaService: EmpresaService,
    public authService: AuthService,
    public router: Router,
    private supabase: SupabaseService,
  ) {}

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    const empresaId = this.empresaService.empresaAtivaId();
    if (!empresaId) return;

    const { inicio, fim } = this.getPeriodo();

    await Promise.all([
      this.loadContasBancarias(empresaId),
      this.loadUltimosLancamentos(empresaId),
      this.loadVencimentos(empresaId),
      this.loadContasAPagarReceber(empresaId),
      this.loadResumoMes(empresaId, inicio, fim),
      this.loadTopDespesas(empresaId, inicio, fim),
      this.loadVencidos(empresaId),
      this.loadEvolucao(empresaId),
      this.loadComposicaoDespesas(empresaId, inicio, fim),
    ]);
  }

  private getPeriodo() {
    const ano = this.anoSelecionado;
    const mes = this.mesSelecionado;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    return {
      inicio: `${ano}-${String(mes).padStart(2, '0')}-01`,
      fim: `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`,
    };
  }

  private async loadContasBancarias(empresaId: string) {
    const { data } = await this.supabase.supabase
      .from('contas_bancarias').select('*').eq('empresa_id', empresaId).eq('ativa', true);
    const contas = (data as ContaBancaria[]) ?? [];
    this.contasBancarias.set(contas);
    this.saldoTotal.set(contas.reduce((s, c) => s + Number(c.saldo_atual), 0));
  }

  private async loadUltimosLancamentos(empresaId: string) {
    const { data } = await this.supabase.supabase
      .from('lancamentos').select('*').eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }).limit(8);
    this.ultimosLancamentos.set((data as Lancamento[]) ?? []);
  }

  private async loadVencimentos(empresaId: string) {
    const hoje = new Date().toISOString().split('T')[0];
    const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const { data } = await this.supabase.supabase
      .from('lancamentos').select('*').eq('empresa_id', empresaId).eq('status', 'pendente')
      .gte('data_vencimento', hoje).lte('data_vencimento', em7dias).order('data_vencimento');
    this.vencimentosProximos.set((data as Lancamento[]) ?? []);
  }

  private async loadContasAPagarReceber(empresaId: string) {
    const { data: pagar } = await this.supabase.supabase
      .from('lancamentos').select('valor').eq('empresa_id', empresaId).eq('tipo', 'despesa').eq('status', 'pendente');
    const { data: receber } = await this.supabase.supabase
      .from('lancamentos').select('valor').eq('empresa_id', empresaId).eq('tipo', 'receita').eq('status', 'pendente');

    const pagarList = (pagar ?? []) as { valor: number }[];
    const receberList = (receber ?? []) as { valor: number }[];
    this.contasAPagar.set(pagarList.reduce((s, l) => s + Number(l.valor), 0));
    this.qtdAPagar.set(pagarList.length);
    this.contasAReceber.set(receberList.reduce((s, l) => s + Number(l.valor), 0));
    this.qtdAReceber.set(receberList.length);

    this.saldoProjetado.set(
      this.saldoTotal() + this.contasAReceber() - this.contasAPagar()
    );
  }

  private async loadResumoMes(empresaId: string, inicio: string, fim: string) {
    const { data } = await this.supabase.supabase
      .from('lancamentos').select('valor, tipo')
      .eq('empresa_id', empresaId).in('status', ['pago', 'recebido'])
      .gte('data_vencimento', inicio).lte('data_vencimento', fim);

    const lancs = (data ?? []) as { valor: number; tipo: string }[];
    const rec = lancs.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const desp = lancs.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
    const lucro = rec - desp;

    this.receitaMes.set(rec);
    this.despesaMes.set(desp);
    this.lucroLiquido.set(lucro);
    this.margemLiquida.set(rec > 0 ? (lucro / rec) * 100 : 0);
  }

  private async loadTopDespesas(empresaId: string, inicio: string, fim: string) {
    const { data } = await this.supabase.supabase
      .from('lancamentos').select('descricao, valor')
      .eq('empresa_id', empresaId).eq('tipo', 'despesa').in('status', ['pago', 'recebido', 'pendente'])
      .gte('data_vencimento', inicio).lte('data_vencimento', fim)
      .order('valor', { ascending: false }).limit(5);

    const lancs = (data ?? []) as { descricao: string; valor: number }[];
    const maxVal = lancs.length > 0 ? Number(lancs[0].valor) : 1;

    this.topDespesas.set(lancs.map((l) => ({
      descricao: l.descricao,
      valor: Number(l.valor),
      percentual: (Number(l.valor) / maxVal) * 100,
    })));
  }

  private async loadVencidos(empresaId: string) {
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await this.supabase.supabase
      .from('lancamentos').select('valor')
      .eq('empresa_id', empresaId).eq('status', 'pendente')
      .lt('data_vencimento', hoje);

    const lancs = (data ?? []) as { valor: number }[];
    this.totalVencido.set(lancs.reduce((s, l) => s + Number(l.valor), 0));
    this.qtdVencido.set(lancs.length);
  }

  private async loadComposicaoDespesas(empresaId: string, inicio: string, fim: string) {
    const { data } = await this.supabase.supabase
      .from('lancamentos')
      .select('valor, fornecedor_cliente, plano_conta:plano_contas(descricao)')
      .eq('empresa_id', empresaId).eq('tipo', 'despesa').in('status', ['pago', 'recebido'])
      .gte('data_vencimento', inicio).lte('data_vencimento', fim);

    if (!data || data.length === 0) {
      this.composicaoDespesasData.set(null);
      return;
    }

    const grupos: Record<string, number> = {};
    for (const l of data) {
      const cat = (l as any).plano_conta?.descricao ?? (l as any).fornecedor_cliente ?? 'Outros';
      grupos[cat] = (grupos[cat] ?? 0) + Number((l as any).valor);
    }

    const sorted = Object.entries(grupos).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const cores = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];

    this.composicaoDespesasData.set({
      labels: sorted.map(([k]) => k.substring(0, 20)),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: cores,
      }],
    });
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
        .eq('empresa_id', empresaId).in('status', ['pago', 'recebido'])
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
        fill: true, tension: 0.3,
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
