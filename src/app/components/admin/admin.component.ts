import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
// ==========================================
// OBSERVABLES (RxJS): Patrón reactivo para datos asíncronos
// ==========================================
// debounceTime: espera 400ms antes de emitir cambios (optimización)
// distinctUntilChanged: emite solo si el valor cambió
// Subject: flujo manual de eventos
// takeUntil: desuscribirse automáticamente (cleanup)
// map: transforma datos en el pipeline
// ==========================================
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

  // Formulario reactivo: vincula cambios de categoría/descuento
  public filterForm = new FormGroup({
    categoria: new FormControl('Todas'),
    descuento: new FormControl(0)
  });

  public categorias$ = this.catalogoService.categorias$;
  // Worker: instancia del Thread secundario para procesamiento paralelo
  private worker!: Worker;
  // Subject para manejo limpio de suscripciones (unsubscribe automático)
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    // ==========================================
    // CREACIÓN DEL WEB WORKER (Hilo secundario)
    // ==========================================
    // Crea una instancia de Worker si el navegador lo soporta
    // El Worker corre en su propio hilo, sin bloquear la UI
    if (typeof Worker !== 'undefined') {
      // new Worker(): instancia el hilo secundario con el archivo descuentos.worker.ts
      this.worker = new Worker(new URL('../../workers/descuentos.worker', import.meta.url));
      // worker.onmessage: recibe datos procesados del Worker (comunicación Thread → Main)
      this.worker.onmessage = ({ data }) => {
        // Actualiza el servicio reactivamente: los componentes se entaran automáticamente
        this.catalogoService.actualizarCatalogo(data);
      };
    } else {
      console.warn('Web Workers are not supported in this environment.');
    }

    // ==========================================
    // PIPELINE REACTIVO: Observable chain
    // ==========================================
    // Cuando usuario cambia categoría/descuento:
    this.filterForm.valueChanges
      .pipe(
        // Esperar 400ms de inactividad antes de procesar (evitar exceso de Threads)
        debounceTime(400),
        // Solo procesar si realmente cambió algo
        distinctUntilChanged((prev, curr) =>
          prev.categoria === curr.categoria && prev.descuento === curr.descuento
        ),
        // Desuscribirse automáticamente cuando se destruye el componente
        takeUntil(this.destroy$)
      )
      // Suscribirse a cambios: enviar datos al Worker
      .subscribe(value => {
        if (this.worker) {
          // Obtener catálogo original (sin descuentos aplicados)
          const catalogoOriginal = this.catalogoService.getCatalogoOriginal();
          // postMessage(): Comunicación Main Thread → Worker Thread
          // El Worker recibe datos y los procesa en paralelo (sin bloquear UI)
          this.worker.postMessage({
            catalogoOriginal: catalogoOriginal,
            porcentajeDescuento: value.descuento || 0,
            categoriaSeleccionada: value.categoria || 'Todas'
          });
        }
      });
  }

  // Cleanup: muy importante para evitar memory leaks
  ngOnDestroy(): void {
    // Completar el Subject para desuscribir todos los Observables
    this.destroy$.next();
    this.destroy$.complete();
    // Terminar el Worker para liberar recursos del hilo secundario
    if (this.worker) {
      this.worker.terminate();
    }
  }
}
