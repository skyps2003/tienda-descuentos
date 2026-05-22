import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil, map } from 'rxjs';
import { CatalogoService } from '../../services/catalogo.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {
  private catalogoService = inject(CatalogoService);

  public filterForm = new FormGroup({
    categoria: new FormControl('Todas'),
    descuento: new FormControl(0)
  });
  
  public categorias$ = this.catalogoService.categorias$;
  private worker!: Worker;
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/descuentos.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.catalogoService.actualizarCatalogo(data);
      };
    } else {
      console.warn('Web Workers are not supported in this environment.');
    }

    this.filterForm.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged((prev, curr) => 
          prev.categoria === curr.categoria && prev.descuento === curr.descuento
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (this.worker) {
          const catalogoOriginal = this.catalogoService.getCatalogoOriginal();
          this.worker.postMessage({
            catalogoOriginal: catalogoOriginal,
            porcentajeDescuento: value.descuento || 0,
            categoriaSeleccionada: value.categoria || 'Todas'
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.worker) {
      this.worker.terminate();
    }
  }
}
