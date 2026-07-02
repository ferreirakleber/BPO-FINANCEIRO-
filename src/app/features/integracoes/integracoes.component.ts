import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { EmpresaService } from '../../core/services/empresa.service';
import { SupabaseService } from '../../core/services/supabase.service';

const CA_CLIENT_ID  = '70qhamr04j19mbsmv8692msrli';
const CA_AUTH_URL   = 'https://auth.contaazul.com/oauth2/authorize';
const REDIRECT_URI  = 'https://bpo-financeiro-app.vercel.app/integracoes/callback';
const SUPABASE_FN   = 'https://dyevrzaedkbzgvoukdeo.supabase.co/functions/v1';

interface Integracao {
  id: string;
  empresa_id: string;
  empresa_nome: string;
  status: 'ativo' | 'erro' | 'expirado' | 'nao_conectado';
  ultima_sync: string | null;
}

@Component({
  selector: 'app-integracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, TagModule,
            TableModule, ToastModule, DialogModule, DropdownModule],
  providers: [MessageService],
  template: `
    <div class="page-header">
      <div>
        <h2>Integrações</h2>
        <p class="subtitle">Conecte suas empresas ao Conta Azul para sincronização automática</p>
      </div>
    </div>

    <!-- Status cards -->
    <div class="status-cards">
      <div class="status-card connected">
        <i class="pi pi-check-circle"></i>
        <div>
          <strong>{{ qtdConectadas() }}</strong>
          <span>Conectadas</span>
        </div>
      </div>
      <div class="status-card pending">
        <i class="pi pi-clock"></i>
        <div>
          <strong>{{ qtdPendentes() }}</strong>
          <span>Pendentes</span>
        </div>
      </div>
    </div>

    <!-- Tabela de empresas -->
    <p-card header="Empresas">
      <p-table [value]="integracoes()" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Empresa</th>
            <th>Status</th>
            <th>Última Sincronização</th>
            <th style="width: 220px">Ações</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td>
              <div class="empresa-cell">
                <span class="empresa-nome">{{ row.empresa_nome }}</span>
              </div>
            </td>
            <td>
              <p-tag
                [value]="statusLabel(row.status)"
                [severity]="statusSeverity(row.status)"
              />
            </td>
            <td>
              @if (row.ultima_sync) {
                <span class="sync-date">{{ row.ultima_sync | date:'dd/MM/yyyy HH:mm' }}</span>
              } @else {
                <span class="text-muted">Nunca sincronizado</span>
              }
            </td>
            <td>
              <div class="action-btns">
                @if (row.status === 'nao_conectado' || row.status === 'expirado') {
                  <p-button
                    label="Conectar Conta Azul"
                    icon="pi pi-link"
                    size="small"
                    (onClick)="conectar(row.empresa_id)"
                  />
                } @else {
                  <p-button
                    label="Sincronizar"
                    icon="pi pi-refresh"
                    size="small"
                    severity="secondary"
                    [loading]="sincronizando() === row.empresa_id"
                    (onClick)="sincronizar(row.empresa_id)"
                  />
                  <p-button
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    [text]="true"
                    title="Desconectar"
                    (onClick)="desconectar(row.empresa_id)"
                  />
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>

    <!-- Dialog: Sincronização com período -->
    <p-dialog [(visible)]="syncVisible" header="Sincronizar com Conta Azul"
              [modal]="true" [style]="{ width: '420px' }">
      <div class="sync-form">
        <div class="field">
          <label>Data início</label>
          <input type="date" [(ngModel)]="syncDataInicio" class="p-inputtext w-full" />
        </div>
        <div class="field">
          <label>Data fim</label>
          <input type="date" [(ngModel)]="syncDataFim" class="p-inputtext w-full" />
        </div>
        <small class="text-muted">
          Os lançamentos do Conta Azul serão importados para este sistema no período selecionado.
        </small>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="syncVisible = false" />
        <p-button label="Sincronizar Agora" icon="pi pi-refresh"
                  [loading]="!!sincronizando()" (onClick)="confirmarSync()" />
      </ng-template>
    </p-dialog>

    <p-toast />
  `,
  styles: `
    .page-header { margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; font-family: 'Space Grotesk', sans-serif; }
    .subtitle { color: var(--text-secondary); margin-top: 0.25rem; font-size: 0.9rem; }

    .status-cards {
      display: flex; gap: 1rem; margin-bottom: 1.5rem;
    }
    .status-card {
      display: flex; align-items: center; gap: 1rem;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: 1rem 1.5rem;
      min-width: 160px;
    }
    .status-card i { font-size: 1.5rem; }
    .status-card.connected i { color: var(--success); }
    .status-card.pending i { color: var(--warning); }
    .status-card strong { display: block; font-size: 1.5rem; font-weight: 700; }
    .status-card span { font-size: 0.8rem; color: var(--text-secondary); }

    .empresa-nome { font-weight: 600; }
    .sync-date { font-size: 0.85rem; }
    .text-muted { color: var(--text-muted); font-size: 0.85rem; }

    .action-btns { display: flex; gap: 0.5rem; align-items: center; }

    .sync-form .field { margin-bottom: 1rem; }
    .sync-form label { display: block; font-weight: 600; margin-bottom: 0.4rem; font-size: 0.875rem; }
    .sync-form input { width: 100%; }
  `,
})
export class IntegracoesComponent implements OnInit {
  integracoes = signal<Integracao[]>([]);
  sincronizando = signal<string | null>(null);
  syncVisible = false;
  syncEmpresaId: string | null = null;
  syncDataInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];
  syncDataFim = new Date().toISOString().split('T')[0];

  qtdConectadas = () => this.integracoes().filter(i => i.status === 'ativo').length;
  qtdPendentes  = () => this.integracoes().filter(i => i.status !== 'ativo').length;

  constructor(
    private empresaService: EmpresaService,
    private supabaseService: SupabaseService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit() {
    await this.empresaService.loadEmpresas();
    await this.carregarIntegracoes();
    await this.verificarCallback();
  }

  private async verificarCallback() {
    const code      = this.route.snapshot.queryParamMap.get('code');
    const empresaId = sessionStorage.getItem('ca_connect_empresa_id');

    if (code && empresaId) {
      sessionStorage.removeItem('ca_connect_empresa_id');
      this.router.navigate([], { queryParams: {} });

      try {
        const { data: { session } } = await this.supabaseService.supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_FN}/contaazul-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ code, empresa_id: empresaId }),
        });

        if (!res.ok) throw new Error(await res.text());

        this.messageService.add({ severity: 'success', summary: 'Conta Azul conectado com sucesso!' });
        await this.carregarIntegracoes();
      } catch (e: any) {
        this.messageService.add({ severity: 'error', summary: 'Erro ao conectar', detail: e.message });
      }
    }
  }

  private async carregarIntegracoes() {
    const empresas = this.empresaService.empresas();
    const { data: tokens } = await this.supabaseService.supabase
      .from('integracoes_contaazul')
      .select('empresa_id, status, ultima_sync');

    const tokenMap = new Map((tokens ?? []).map((t: any) => [t.empresa_id, t]));

    this.integracoes.set(empresas.map((e) => {
      const token = tokenMap.get(e.id) as any;
      return {
        id:           e.id,
        empresa_id:   e.id,
        empresa_nome: e.nome_fantasia || e.razao_social,
        status:       token?.status ?? 'nao_conectado',
        ultima_sync:  token?.ultima_sync ?? null,
      };
    }));
  }

  conectar(empresaId: string) {
    sessionStorage.setItem('ca_connect_empresa_id', empresaId);
    const url = `${CA_AUTH_URL}?response_type=code&client_id=${CA_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid+profile+aws.cognito.signin.user.admin&state=${empresaId}`;
    window.location.href = url;
  }

  sincronizar(empresaId: string) {
    this.syncEmpresaId = empresaId;
    this.syncVisible = true;
  }

  async confirmarSync() {
    if (!this.syncEmpresaId) return;
    this.sincronizando.set(this.syncEmpresaId);
    this.syncVisible = false;

    try {
      const { data: { session } } = await this.supabaseService.supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_FN}/contaazul-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          empresa_id:  this.syncEmpresaId,
          data_inicio: this.syncDataInicio,
          data_fim:    this.syncDataFim,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      this.messageService.add({
        severity: 'success',
        summary: `${result.importados} lançamentos sincronizados!`,
      });
      await this.carregarIntegracoes();
    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'Erro na sincronização', detail: e.message });
    } finally {
      this.sincronizando.set(null);
    }
  }

  async desconectar(empresaId: string) {
    await this.supabaseService.supabase
      .from('integracoes_contaazul')
      .delete()
      .eq('empresa_id', empresaId);
    await this.carregarIntegracoes();
    this.messageService.add({ severity: 'info', summary: 'Conta Azul desconectado' });
  }

  statusLabel(s: string) {
    return { ativo: 'Conectado', erro: 'Erro', expirado: 'Expirado', nao_conectado: 'Não conectado' }[s] ?? s;
  }

  statusSeverity(s: string): any {
    return { ativo: 'success', erro: 'danger', expirado: 'warn', nao_conectado: 'secondary' }[s] ?? 'secondary';
  }
}
