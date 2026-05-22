import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { ClienteComponent } from './components/cliente/cliente.component';

export const routes: Routes = [
  { path: 'cliente', component: ClienteComponent },
  { path: 'admin', component: AdminComponent },
  { path: '', redirectTo: '/cliente', pathMatch: 'full' },
  { path: '**', redirectTo: '/cliente' }
];
