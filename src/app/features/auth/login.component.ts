import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';
import { EmpresaService } from '../../core/services/empresa.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule,
    MessageModule,
  ],
  template: `
    <div class="login-container">
      <p-card styleClass="login-card">
        <ng-template pTemplate="header">
          <div class="login-header">
            <h2>BPO Financeiro</h2>
            <p>Acesse sua conta</p>
          </div>
        </ng-template>

        @if (error()) {
          <p-message severity="error" [text]="error()!" />
        }

        <div class="field">
          <label for="email">E-mail</label>
          <input
            id="email"
            type="email"
            pInputText
            [(ngModel)]="email"
            class="w-full"
            placeholder="seu@email.com"
          />
        </div>

        <div class="field">
          <label for="password">Senha</label>
          <p-password
            id="password"
            [(ngModel)]="password"
            [toggleMask]="true"
            [feedback]="false"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>

        <p-button
          label="Entrar"
          icon="pi pi-sign-in"
          (onClick)="onLogin()"
          [loading]="loading()"
          styleClass="w-full"
        />
      </p-card>
    </div>
  `,
  styles: `
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: var(--surface-ground);
    }

    :host ::ng-deep .login-card {
      width: 400px;
    }

    .login-header {
      text-align: center;
      padding: 2rem 0 1rem;
    }

    .login-header h2 {
      margin: 0;
      color: var(--primary-color);
    }

    .login-header p {
      margin: 0.5rem 0 0;
      color: var(--text-color-secondary);
    }

    .field {
      margin-bottom: 1.5rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(
    private authService: AuthService,
    private empresaService: EmpresaService,
    private router: Router,
  ) {}

  async onLogin() {
    this.loading.set(true);
    this.error.set(null);

    const err = await this.authService.login(this.email, this.password);

    if (err) {
      this.error.set('E-mail ou senha inválidos');
      this.loading.set(false);
      return;
    }

    await this.empresaService.loadEmpresas();
    await this.empresaService.restoreEmpresaAtiva();

    if (this.empresaService.empresaAtiva()) {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/selecionar-empresa']);
    }

    this.loading.set(false);
  }
}
