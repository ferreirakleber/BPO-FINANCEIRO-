import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private _lastSync = signal<Date | null>(null);
  lastSync = this._lastSync.asReadonly();

  notifySync() {
    this._lastSync.set(new Date());
  }
}
