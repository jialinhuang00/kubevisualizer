import { Component } from '@angular/core';
import { DashboardComponent } from './features/kubectl-dashboard/components/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent],
  template: '<app-dashboard></app-dashboard>',
  styleUrls: []
})
export class App {
}