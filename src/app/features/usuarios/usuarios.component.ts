import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UsuarioService } from '../../core/services/usuario.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { Usuario, Perfil } from '../../core/models/usuario.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    MultiSelectModule,
    TagModule,
    PasswordModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="page-header">
      <h2>Usuários</h2>
      <p-button label="Novo Usuário" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <p-table
      [value]="usuarioService.usuarios()"
      [loading]="usuarioService.loading()"
      [paginator]="true"
      [rows]="10"
      [rowHover]="true"
      styleClass="p-datatable-striped"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Perfil</th>
          <th>Status</th>
          <th style="width: 120px">Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-usuario>
        <tr>
          <td>{{ usuario.nome }}</td>
          <td>{{ usuario.email }}</td>
          <td>
            <p-tag [value]="usuario.perfil" [severity]="getPerfilSeverity(usuario.perfil)" />
          </td>
          <td>
            <p-tag
              [value]="usuario.ativo ? 'Ativo' : 'Inativo'"
              [severity]="usuario.ativo ? 'success' : 'danger'"
            />
          </td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" (onClick)="openEdit(usuario)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="5" style="text-align: center">Nenhum usuário cadastrado</td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editing ? 'Editar Usuário' : 'Novo Usuário'"
      [modal]="true"
      [style]="{ width: '550px' }"
    >
      <div class="field">
        <label>Nome</label>
        <input pInputText [(ngModel)]="form.nome" class="w-full" />
      </div>
      <div class="field">
        <label>E-mail</label>
        <input pInputText [(ngModel)]="form.email" class="w-full" type="email" [disabled]="editing" />
      </div>

      @if (!editing) {
        <div class="field">
          <label>Senha</label>
          <p-password [(ngModel)]="password" [toggleMask]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full" />
        </div>
      }

      <div class="field">
        <label>Perfil</label>
        <p-dropdown
          [(ngModel)]="form.perfil"
          [options]="perfis"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione"
          styleClass="w-full"
        />
      </div>
      <div class="field">
        <label>Empresas Vinculadas</label>
        <p-multiSelect
          [(ngModel)]="selectedEmpresas"
          [options]="empresaOptions()"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione as empresas"
          styleClass="w-full"
        />
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" [text]="true" (onClick)="dialogVisible = false" />
        <p-button label="Salvar" icon="pi pi-check" (onClick)="save()" [loading]="saving()" />
      </ng-template>
    </p-dialog>

    <p-toast />
  `,
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .page-header h2 { margin: 0; }

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
export class UsuariosComponent implements OnInit {
  dialogVisible = false;
  editing = false;
  editingId: string | null = null;
  saving = signal(false);
  form: Partial<Usuario> = {};
  password = '';
  selectedEmpresas: string[] = [];

  perfis = [
    { label: 'Administrador Geral', value: 'admin_geral' },
    { label: 'Financeiro', value: 'financeiro' },
    { label: 'Gestor', value: 'gestor' },
    { label: 'Consulta', value: 'consulta' },
    { label: 'Auditor', value: 'auditor' },
  ];

  empresaOptions = signal<{ label: string; value: string }[]>([]);

  constructor(
    public usuarioService: UsuarioService,
    private empresaService: EmpresaService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await this.usuarioService.loadUsuarios();
    await this.empresaService.loadEmpresas();
    this.empresaOptions.set(
      this.empresaService.empresas().map((e) => ({
        label: e.nome_fantasia || e.razao_social,
        value: e.id,
      })),
    );
  }

  openNew() {
    this.form = {};
    this.password = '';
    this.selectedEmpresas = [];
    this.editing = false;
    this.editingId = null;
    this.dialogVisible = true;
  }

  async openEdit(usuario: Usuario) {
    this.form = { ...usuario };
    this.editing = true;
    this.editingId = usuario.id;
    this.selectedEmpresas = await this.usuarioService.getUsuarioEmpresas(usuario.id);
    this.dialogVisible = true;
  }

  async save() {
    if (!this.form.nome || !this.form.email || !this.form.perfil) {
      this.messageService.add({ severity: 'warn', summary: 'Preencha todos os campos obrigatórios' });
      return;
    }

    this.saving.set(true);

    if (this.editing && this.editingId) {
      await this.usuarioService.updateUsuario(this.editingId, {
        nome: this.form.nome,
        perfil: this.form.perfil,
      });
      await this.usuarioService.updateUsuarioEmpresas(this.editingId, this.selectedEmpresas);
      this.messageService.add({ severity: 'success', summary: 'Usuário atualizado' });
    } else {
      if (!this.password) {
        this.messageService.add({ severity: 'warn', summary: 'Informe a senha' });
        this.saving.set(false);
        return;
      }
      const err = await this.usuarioService.createUsuario(this.form, this.selectedEmpresas, this.password);
      if (err) {
        this.messageService.add({ severity: 'error', summary: err });
      } else {
        this.messageService.add({ severity: 'success', summary: 'Usuário criado' });
      }
    }

    this.saving.set(false);
    this.dialogVisible = false;
  }

  getPerfilSeverity(perfil: Perfil): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<Perfil, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      admin_geral: 'danger',
      financeiro: 'warn',
      gestor: 'info',
      consulta: 'secondary',
      auditor: 'success',
    };
    return map[perfil] ?? 'info';
  }
}
