import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#64748b">Conectando ao Conta Azul...</div>`,
})
export class OauthCallbackComponent implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (code) {
      sessionStorage.setItem('ca_oauth_code', code);
      if (state) sessionStorage.setItem('ca_connect_empresa_id', state);
    }

    this.router.navigate(['/integracoes']);
  }
}
