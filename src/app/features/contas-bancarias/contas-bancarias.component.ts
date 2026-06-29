import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ContaBancariaService } from '../../core/services/conta-bancaria.service';
import { ContaBancaria } from '../../core/models/conta-bancaria.model';

@Component({
  selector: 'app-contas-bancarias',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, TagModule, ToastModule, ConfirmDialogModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="page-header">
      <h2>Contas Bancárias</h2>
      <p-button label="Nova Conta" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <p-table
      [value]="contaBancariaService.contas()"
      [loading]="contaBancariaService.loading()"
      [paginator]="true"
      [rows]="10"
      [rowHover]="true"
      styleClass="p-datatable-striped"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Banco</th>
          <th>Agência</th>
          <th>Conta</th>
          <th>Descrição</th>
          <th>Saldo Atual</th>
          <th style="width: 120px">Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-conta>
        <tr>
          <td>{{ conta.banco }}</td>
          <td>{{ conta.agencia }}</td>
          <td>{{ conta.conta }}</td>
          <td>{{ conta.descricao }}</td>
          <td [class]="conta.saldo_atual >= 0 ? 'saldo-positivo' : 'saldo-negativo'">
            {{ conta.saldo_atual | currency:'BRL' }}
          </td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" (onClick)="openEdit(conta)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="confirmDelete(conta)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6" style="text-align: center">Nenhuma conta bancária cadastrada</td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editing ? 'Editar Conta' : 'Nova Conta Bancária'"
      [modal]="true"
      [style]="{ width: '500px' }"
    >
      <div class="field">
        <label>Banco</label>
        <input pInputText [(ngModel)]="form.banco" class="w-full" placeholder="Ex: Bradesco" />
      </div>
      <div class="field">
        <label>Agência</label>
        <input pInputText [(ngModel)]="form.agencia" class="w-full" />
      </div>
      <div class="field">
        <label>Conta</label>
        <input pInputText [(ngModel)]="form.conta" class="w-full" />
      </div>
      <div class="field">
        <label>Descrição</label>
        <input pInputText [(ngModel)]="form.descricao" class="w-full" placeholder="Ex: Conta Principal" />
      </div>
      <div class="field">
        <label>Saldo Inicial</label>
        <p-inputNumber [(ngModel)]="form.saldo_inicial" mode="currency" currency="BRL" locale="pt-BR" styleClass="w-full" />
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
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .page-header h2 { margin: 0; }
    .field { margin-bottom: 1rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
    .saldo-positivo { color: #22c55e; font-weight: 600; }
    .saldo-negativo { color: #ef4444; font-weight: 600; }
  `,
})
export class ContasBancariasComponent implements OnInit {
  dialogVisible = false;
  editing = false;
  editingId: string | null = null;
  saving = signal(false);
  form: Partial<ContaBancaria> = {};

  constructor(
    public contaBancariaService: ContaBancariaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await this.contaBancariaService.loadContas();
  }

  openNew() {
    this.form = { saldo_inicial: 0 };
    this.editing = false;
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEdit(conta: ContaBancaria) {
    this.form = { ...conta };
    this.editing = true;
    this.editingId = conta.id;
    this.dialogVisible = true;
  }

  async save() {
    if (!this.form.banco || !this.form.agencia || !this.form.conta || !this.form.descricao) {
      this.messageService.add({ severity: 'warn', summary: 'Preencha todos os campos' });
      return;
    }

    this.saving.set(true);

    if (this.editing && this.editingId) {
      await this.contaBancariaService.update(this.editingId, this.form);
      this.messageService.add({ severity: 'success', summary: 'Conta atualizada' });
    } else {
      await this.contaBancariaService.create(this.form);
      this.messageService.add({ severity: 'success', summary: 'Conta criada' });
    }

    this.saving.set(false);
    this.dialogVisible = false;
  }

  confirmDelete(conta: ContaBancaria) {
    this.confirmationService.confirm({
      message: `Deseja desativar a conta ${conta.descricao}?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        await this.contaBancariaService.delete(conta.id);
        this.messageService.add({ severity: 'success', summary: 'Conta desativada' });
      },
    });
  }
}
