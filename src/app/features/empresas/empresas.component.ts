import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { EmpresaService } from '../../core/services/empresa.service';
import { PlanoContasService } from '../../core/services/plano-contas.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Empresa } from '../../core/models/empresa.model';
import { CnpjPipe } from '../../shared/pipes/cnpj.pipe';

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    CnpjPipe,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-header">
      <h2>Empresas</h2>
      <p-button label="Nova Empresa" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <p-table
      [value]="empresaService.empresas()"
      [loading]="empresaService.loading()"
      [paginator]="true"
      [rows]="10"
      [rowHover]="true"
      styleClass="p-datatable-striped"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>CNPJ</th>
          <th>Razão Social</th>
          <th>Nome Fantasia</th>
          <th>Status</th>
          <th style="width: 120px">Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-empresa>
        <tr>
          <td style="font-family: monospace">{{ empresa.cnpj | cnpj }}</td>
          <td>{{ empresa.razao_social }}</td>
          <td>{{ empresa.nome_fantasia || '-' }}</td>
          <td>
            <p-tag
              [value]="empresa.ativa ? 'Ativa' : 'Inativa'"
              [severity]="empresa.ativa ? 'success' : 'danger'"
            />
          </td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" (onClick)="openEdit(empresa)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDelete(empresa)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="5" style="text-align: center">Nenhuma empresa cadastrada</td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editing ? 'Editar Empresa' : 'Nova Empresa'"
      [modal]="true"
      [style]="{ width: '540px' }"
    >
      <div class="field">
        <label>CNPJ</label>
        <input pInputText [(ngModel)]="form.cnpj" class="w-full" placeholder="00000000000000" maxlength="14" />
      </div>
      <div class="field">
        <label>Razão Social</label>
        <input pInputText [(ngModel)]="form.razao_social" class="w-full" />
      </div>
      <div class="field">
        <label>Nome Fantasia</label>
        <input pInputText [(ngModel)]="form.nome_fantasia" class="w-full" />
      </div>

      <!-- Logo e Cor -->
      <div class="field">
        <label>Logo da Empresa</label>
        <div class="logo-upload-area">
          @if (form.logo_url) {
            <img [src]="form.logo_url" class="logo-preview" alt="Logo" />
          } @else {
            <div class="logo-placeholder">
              <i class="pi pi-image"></i>
              <span>Sem logo</span>
            </div>
          }
          <div class="logo-actions">
            <label class="upload-btn">
              <input type="file" accept="image/*" (change)="onLogoChange($event)" style="display:none" />
              <i class="pi pi-upload"></i> {{ uploadingLogo() ? 'Enviando...' : 'Enviar Logo' }}
            </label>
            @if (form.logo_url) {
              <button class="remove-btn" (click)="form.logo_url = null">
                <i class="pi pi-times"></i> Remover
              </button>
            }
          </div>
        </div>
      </div>

      <div class="field">
        <label>Cor Principal</label>
        <div class="color-row">
          <input type="color" [(ngModel)]="form.cor_primaria" class="color-input" />
          <input pInputText [(ngModel)]="form.cor_primaria" class="color-text" placeholder="#3B82F6" maxlength="7" />
          <div class="color-preview" [style.background]="form.cor_primaria || '#3B82F6'"></div>
        </div>
        <div class="color-presets">
          @for (cor of coresSugeridas; track cor) {
            <button class="color-dot" [style.background]="cor"
              [class.active]="form.cor_primaria === cor"
              (click)="form.cor_primaria = cor" [title]="cor"></button>
          }
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="dialogVisible = false" />
        <p-button label="Salvar" icon="pi pi-check" (onClick)="save()" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
    <p-toast />
  `,
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .page-header h2 {
      margin: 0;
    }

    .field {
      margin-bottom: 1rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .logo-upload-area {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem; border: 1px dashed var(--border, #e2e8f0);
      border-radius: 8px; background: var(--bg-page, #f8fafc);
    }
    .logo-preview { width: 72px; height: 72px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; }
    .logo-placeholder { width: 72px; height: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; border: 1px dashed #cbd5e1; color: #94a3b8; font-size: 0.75rem; gap: 4px; }
    .logo-placeholder i { font-size: 1.5rem; }
    .logo-actions { display: flex; flex-direction: column; gap: 0.5rem; }
    .upload-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem; border-radius: 6px; background: var(--accent, #3B82F6); color: #fff; font-size: 0.8rem; cursor: pointer; border: none; }
    .remove-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem; border-radius: 6px; background: transparent; color: #ef4444; font-size: 0.8rem; cursor: pointer; border: 1px solid #ef4444; }

    .color-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .color-input { width: 44px; height: 38px; padding: 2px; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer; }
    .color-text { flex: 1; }
    .color-preview { width: 38px; height: 38px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .color-presets { display: flex; gap: 8px; flex-wrap: wrap; }
    .color-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s; }
    .color-dot:hover, .color-dot.active { transform: scale(1.2); border-color: #1e293b; }
  `,
})
export class EmpresasComponent implements OnInit {
  dialogVisible = false;
  editing = false;
  editingId: string | null = null;
  saving = signal(false);
  uploadingLogo = signal(false);
  form: Partial<Empresa> = {};

  coresSugeridas = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  ];

  constructor(
    public empresaService: EmpresaService,
    private planoContasService: PlanoContasService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private supabaseService: SupabaseService,
  ) {}

  async ngOnInit() {
    await this.empresaService.loadEmpresas();
  }

  openNew() {
    this.form = { cor_primaria: '#3B82F6' };
    this.editing = false;
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEdit(empresa: Empresa) {
    this.form = { ...empresa, cor_primaria: empresa.cor_primaria || '#3B82F6' };
    this.editing = true;
    this.editingId = empresa.id;
    this.dialogVisible = true;
  }

  async onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadingLogo.set(true);
    const ext = file.name.split('.').pop();
    const path = `logos/${Date.now()}.${ext}`;

    const { data, error } = await this.supabaseService.supabase.storage
      .from('empresas')
      .upload(path, file, { upsert: true });

    if (!error && data) {
      const { data: urlData } = this.supabaseService.supabase.storage
        .from('empresas')
        .getPublicUrl(path);
      this.form.logo_url = urlData.publicUrl;
    } else {
      this.messageService.add({ severity: 'error', summary: 'Erro ao enviar logo', detail: error?.message });
    }
    this.uploadingLogo.set(false);
  }

  async save() {
    if (!this.form.cnpj || !this.form.razao_social) {
      this.messageService.add({ severity: 'warn', summary: 'Preencha CNPJ e Razão Social' });
      return;
    }

    this.saving.set(true);

    if (this.editing && this.editingId) {
      const ok = await this.empresaService.updateEmpresa(this.editingId, this.form);
      if (ok) {
        this.messageService.add({ severity: 'success', summary: 'Empresa atualizada' });
      }
    } else {
      const empresa = await this.empresaService.createEmpresa(this.form);
      if (empresa) {
        await this.planoContasService.seedPlanoPadrao(empresa.id);
        this.messageService.add({ severity: 'success', summary: 'Empresa criada com plano de contas padrão' });
      }
    }

    this.saving.set(false);
    this.dialogVisible = false;
  }

  confirmDelete(empresa: Empresa) {
    this.confirmationService.confirm({
      message: `Deseja desativar a empresa ${empresa.razao_social}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        await this.empresaService.deleteEmpresa(empresa.id);
        this.messageService.add({ severity: 'success', summary: 'Empresa desativada' });
      },
    });
  }
}
