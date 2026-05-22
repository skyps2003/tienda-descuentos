import { Component } from '@angular/core';
import { AdminComponent } from './components/admin/admin.component';
import { ClienteComponent } from './components/cliente/cliente.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AdminComponent, ClienteComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'catalogo-reactivo-categorias';
}
