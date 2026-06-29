import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { empresaGuard } from './core/guards/empresa.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './features/auth/login.component';
import { EmpresaSelectComponent } from './features/empresa-select/empresa-select.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'selecionar-empresa',
    component: EmpresaSelectComponent,
    canActivate: [authGuard],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard, empresaGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'empresas',
        loadComponent: () =>
          import('./features/empresas/empresas.component').then(
            (m) => m.EmpresasComponent,
          ),
        canActivate: [roleGuard('admin_geral')],
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(
            (m) => m.UsuariosComponent,
          ),
        canActivate: [roleGuard('admin_geral')],
      },
      {
        path: 'importacao',
        loadComponent: () =>
          import('./features/importacao/importacao.component').then(
            (m) => m.ImportacaoComponent,
          ),
      },
      {
        path: 'calendario',
        loadComponent: () =>
          import('./features/calendario/calendario.component').then(
            (m) => m.CalendarioComponent,
          ),
      },
      {
        path: 'contas-bancarias',
        loadComponent: () =>
          import('./features/contas-bancarias/contas-bancarias.component').then(
            (m) => m.ContasBancariasComponent,
          ),
      },
      {
        path: 'dre',
        loadComponent: () =>
          import('./features/dre/dre.component').then(
            (m) => m.DreComponent,
          ),
      },
      {
        path: 'lancamentos',
        loadComponent: () =>
          import('./features/lancamentos/lancamentos.component').then(
            (m) => m.LancamentosComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
