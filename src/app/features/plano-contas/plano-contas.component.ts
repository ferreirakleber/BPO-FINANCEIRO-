import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService, TreeNode } from 'primeng/api';
import { PlanoContasService } from '../../core/services/plano-contas.service';
import { PlanoConta, TipoConta, GrupoDre } from '../../core/models/plano-contas.model';

@Component({
  selector: 'app-plano-contas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TreeTableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="page-header">
      <h2>Plano de Contas</h2>
      <p-button label="Nova Conta" icon="pi pi-plus" (onClick)="openNew()" />
    </div>

    <p-treeTable
      [value]="treeData()"
      [loading]="planoContasService.loading()"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Código</th>
          <th>Descrição</th>
          <th>Tipo</th>
          <th>Grupo DRE</th>
          <th style="width: 120px">Ações</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-rowNode let-rowData="rowData">
        <tr>
          <td>
            <p-treeTableToggler [rowNode]="rowNode" />
            <span style="font-family: monospace">{{ rowData.codigo }}</span>
          </td>
          <td>{{ rowData.descricao }}</td>
          <td>
            <p-tag [value]="rowData.tipo" [severity]="getTipoSeverity(rowData.tipo)" />
          </td>
          <td>{{ formatGrupoDre(rowData.grupo_dre) }}</td>
          <td>
            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" (onClick)="openEdit(rowData)" />
            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="deleteConta(rowData)" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="5" style="text-align: center">Nenhuma conta cadastrada</td>
        </tr>
      </ng-template>
    </p-treeTable>

    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editing ? 'Editar Conta' : 'Nova Conta'"
      [modal]="true"
      [style]="{ width: '500px' }"
    >
      <div class="field">
        <label>Código</label>
        <input pInputText [(ngModel)]="form.codigo" class="w-full" placeholder="Ex: 4.1.01" />
      </div>
      <div class="field">
        <label>Descrição</label>
        <input pInputText [(ngModel)]="form.descricao" class="w-full" />
      </div>
      <div class="field">
        <label>Tipo</label>
        <p-dropdown
          [(ngModel)]="form.tipo"
          [options]="tipos"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione"
          styleClass="w-full"
        />
      </div>
      <div class="field">
        <label>Grupo DRE</label>
        <p-dropdown
          [(ngModel)]="form.grupo_dre"
          [options]="gruposDre"
          optionLabel="label"
          optionValue="value"
          placeholder="Selecione"
          styleClass="w-full"
        />
      </div>
      <div class="field">
        <label>Conta Pai</label>
        <p-dropdown
          [(ngModel)]="form.conta_pai_id"
          [options]="contaPaiOptions()"
          optionLabel="label"
          optionValue="value"
          placeholder="Nenhuma (conta raiz)"
          [showClear]="true"
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
export class PlanoContasComponent implements OnInit {
  dialogVisible = false;
  editing = false;
  editingId: string | null = null;
  saving = signal(false);
  form: Partial<PlanoConta> = {};

  tipos = [
    { label: 'Receita', value: 'receita' },
    { label: 'Despesa', value: 'despesa' },
    { label: 'Custo', value: 'custo' },
    { label: 'Dedução', value: 'deducao' },
  ];

  gruposDre = [
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

  contaPaiOptions = computed(() =>
    this.planoContasService.contas().map((c) => ({
      label: `${c.codigo} - ${c.descricao}`,
      value: c.id,
    })),
  );

  treeData = computed(() => {
    const contas = this.planoContasService.contas();
    const tree = this.planoContasService.buildTree(contas);
    return this.toTreeNodes(tree);
  });

  constructor(
    public planoContasService: PlanoContasService,
    private messageService: MessageService,
  ) {}

  async ngOnInit() {
    await this.planoContasService.loadContas();
  }

  private toTreeNodes(contas: PlanoConta[]): TreeNode[] {
    return contas.map((c) => ({
      data: c,
      children: c.children ? this.toTreeNodes(c.children) : [],
      expanded: true,
    }));
  }

  openNew() {
    this.form = {};
    this.editing = false;
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEdit(conta: PlanoConta) {
    this.form = { ...conta };
    this.editing = true;
    this.editingId = conta.id;
    this.dialogVisible = true;
  }

  async save() {
    if (!this.form.codigo || !this.form.descricao || !this.form.tipo || !this.form.grupo_dre) {
      this.messageService.add({ severity: 'warn', summary: 'Preencha todos os campos obrigatórios' });
      return;
    }

    this.saving.set(true);

    if (this.editing && this.editingId) {
      await this.planoContasService.updateConta(this.editingId, this.form);
      this.messageService.add({ severity: 'success', summary: 'Conta atualizada' });
    } else {
      await this.planoContasService.createConta(this.form);
      this.messageService.add({ severity: 'success', summary: 'Conta criada' });
    }

    this.saving.set(false);
    this.dialogVisible = false;
  }

  async deleteConta(conta: PlanoConta) {
    await this.planoContasService.deleteConta(conta.id);
    this.messageService.add({ severity: 'success', summary: 'Conta removida' });
  }

  getTipoSeverity(tipo: TipoConta): 'success' | 'info' | 'warn' | 'danger' {
    const map: Record<TipoConta, 'success' | 'info' | 'warn' | 'danger'> = {
      receita: 'success',
      despesa: 'danger',
      custo: 'warn',
      deducao: 'info',
    };
    return map[tipo];
  }

  formatGrupoDre(grupo: GrupoDre): string {
    return this.gruposDre.find((g) => g.value === grupo)?.label ?? grupo;
  }
}
