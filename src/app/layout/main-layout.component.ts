import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../shared/components/header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="layout">
      <app-sidebar />
      <div class="layout-body">
        <app-header />
        <main class="main-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--bg-page);
      transition: background 0.3s;
    }

    .layout-body {
      flex: 1;
      margin-left: var(--sidebar-w, 260px);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
      padding: 1.75rem 2rem;
      background: var(--bg-page);
      transition: background 0.3s;
    }

    @media (max-width: 768px) {
      .layout-body { margin-left: 0; }
    }
  `,
})
export class MainLayoutComponent {}
