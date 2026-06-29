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
      <div class="layout-content">
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
    }

    .layout-content {
      flex: 1;
      margin-left: 250px;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      padding: 1.5rem;
      background: var(--surface-ground);
      flex: 1;
    }
  `,
})
export class MainLayoutComponent {}
