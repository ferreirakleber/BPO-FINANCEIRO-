import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EmpresaService } from '../services/empresa.service';

export const empresaGuard: CanActivateFn = () => {
  const empresaService = inject(EmpresaService);
  const router = inject(Router);

  if (empresaService.empresaAtiva()) {
    return true;
  }

  return router.createUrlTree(['/selecionar-empresa']);
};
