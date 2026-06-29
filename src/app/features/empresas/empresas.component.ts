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
      [style]="{ width: '500px' }"
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
  `,
})
export class EmpresasComponent implements OnInit {
  dialogVisible = false;
  editing = false;
  editingId: string | null = null;
  saving = signal(false);
  form: Partial<Empresa> = {};

  constructor(
    public empresaService: EmpresaService,
    private planoContasService: PlanoContasService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await this.empresaService.loadEmpresas();
  }

  openNew() {
    this.form = {};
    this.editing = false;
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEdit(empresa: Empresa) {
    this.form = { ...empresa };
    this.editing = true;
    this.editingId = empresa.id;
    this.dialogVisible = true;
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
