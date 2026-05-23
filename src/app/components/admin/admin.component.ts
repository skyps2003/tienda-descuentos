import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { CatalogoService, Product } from '../../services/catalogo.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {
  private catalogoService = inject(CatalogoService);

  // Formulario de filtros (categoría + descuento)
  public filterForm = new FormGroup({
    categoria: new FormControl('Todas'),
    descuento: new FormControl(0)
  });

  // ── Benchmark controls ─────────────────────────────────────
  // Modo de procesamiento: 'worker' (hilo secundario) o 'main' (hilo principal)
  public modeControl = new FormControl<'worker' | 'main'>('worker');
  // Cantidad de productos a generar para el benchmark
  public countControl = new FormControl<number>(200);
  // Toggle para activar/desactivar el Debounce
  public debounceControl = new FormControl<boolean>(true);
  // Toggle para tema claro/oscuro (true = Modo Oscuro, false = Modo Claro)
  public themeControl = new FormControl<boolean>(true);

  // ── Accordion / Collapsible state ──────────────────────────
  public isPanelAOpen = true;
  public isPanelBOpen = false;

  // ── Métricas de rendimiento ────────────────────────────────
  public processingTime: number | null = null;      // ms del último descuento aplicado
  public loadTime: number | null = null;            // ms de carga del catálogo
  public isProcessing = false;
  public lastMode: 'worker' | 'main' | null = null; // para mostrar qué modo se usó

  private processingStart = 0;
  public categorias$ = this.catalogoService.categorias$;

  // Worker: hilo secundario para procesamiento en paralelo
  private worker!: Worker;
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    // ── Crear Web Worker ────────────────────────────────────
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/descuentos.worker', import.meta.url));

      // Cuando el Worker termina, captura el tiempo y actualiza el catálogo
      this.worker.onmessage = ({ data }) => {
        const end = performance.now();
        this.processingTime = parseFloat((end - this.processingStart).toFixed(3));
        console.log(`%c[WORKER] Respuesta recibida. Tiempo total asíncrono: ${this.processingTime}ms`, 'color: #4E7CF6');
        console.groupEnd();

        this.isProcessing = false;
        this.lastMode = 'worker';
        this.catalogoService.actualizarCatalogo(data);
      };

      // Trigger inicial
      setTimeout(() => this.triggerDescuento(), 0);

    } else {
      console.warn('Web Workers no soportados en este navegador.');
    }

    // =========================================================================
    // 🧠 PIPELINE REACTIVO CON DEBOUNCE (REBOTE) CONDICIONAL
    // =========================================================================
    // ¿Qué es el Debounce?
    // Imagina que mueves el slider muy rápido del 0% al 50%. Sin debounce,
    // Angular lanzaría 50 eventos seguidos, colapsando el navegador con cálculos.
    // El Debounce actúa como un "portero": espera a que dejes de mover el slider
    // (ej. durante 400ms) antes de dejar pasar el evento final.
    //
    // Aquí usamos RxJS para aplicar ese retraso de forma dinámica. Si está activo,
    // espera 400ms de inactividad. Si se apaga, reacciona al instante a cada píxel.
    // =========================================================================
    
    this.filterForm.valueChanges
      .pipe(
        // debounce() permite decidir el tiempo dinámicamente según una condición
        debounce(() => this.debounceControl.value ? timer(400) : timer(0)),
        distinctUntilChanged((prev, curr) =>
          prev.categoria === curr.categoria && prev.descuento === curr.descuento
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log(`%c[RXJS] ⏳ Evento de formulario procesado (Debounce: ${this.debounceControl.value ? 'ON' : 'OFF'})`, 'color: #D97706');
        this.triggerDescuento();
      });

    // Re-dispara cuando cambia el modo (worker ↔ main)
    this.modeControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.triggerDescuento());

    // Cambiar tema claro/oscuro
    this.themeControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(isDark => {
        if (!isDark) {
          document.body.classList.add('light-theme');
        } else {
          document.body.classList.remove('light-theme');
        }
      });
  }

  // ── Lógica central: decide cómo calcular el descuento ─────
  private triggerDescuento(): void {
    const catalogoOriginal = this.catalogoService.getCatalogoOriginal();
    if (catalogoOriginal.length === 0) return;

    const descuento = this.filterForm.value.descuento || 0;
    const categoria = this.filterForm.value.categoria || 'Todas';

    console.groupCollapsed(`%c⚡ Aplicando descuento: ${descuento}% en ${categoria}`, 'color: #8B5CF6; font-weight: bold;');
    console.log(`Modo: ${(this.modeControl.value || 'worker').toUpperCase()} | Elementos: ${catalogoOriginal.length}`);

    if (this.modeControl.value === 'worker' && this.worker) {
      // ── Modo Web Worker (hilo secundario, no bloquea UI) ───
      this.isProcessing = true;
      this.processingStart = performance.now();
      console.log('%c[MAIN] Enviando datos al Web Worker...', 'color: #4E7CF6');
      this.worker.postMessage({ catalogoOriginal, porcentajeDescuento: descuento, categoriaSeleccionada: categoria });
    } else {
      // ── Modo Hilo Principal (bloquea UI durante el cálculo) ─
      this.isProcessing = true;
      console.log('%c[MAIN] Iniciando cálculo síncrono en Hilo Principal (Bloqueo UI esperado)...', 'color: #B85C50; font-weight: bold');
      const start = performance.now();

      // Cálculo SINCRÓNICO — bloquea el event loop intencionalmente
      const resultado = this.calcularEnMainThread(catalogoOriginal, descuento, categoria);

      const end = performance.now();
      this.processingTime = parseFloat((end - start).toFixed(3));
      console.log(`%c[MAIN] Cálculo terminado en ${this.processingTime}ms`, 'color: #B85C50');
      console.groupEnd();
      
      this.isProcessing = false;
      this.lastMode = 'main';
      this.catalogoService.actualizarCatalogo(resultado);
    }
  }

  // ── Cálculo en hilo principal (réplica del Worker, sin postMessage) ─
  private calcularEnMainThread(catalog: Product[], discount: number, category: string): Product[] {
    return catalog.map(producto => {
      if (category === 'Todas' || producto.category === category) {
        if (discount > 0) {
          const precioFinal = parseFloat((producto.price * (1 - discount / 100)).toFixed(2));
          return { ...producto, precioFinal: precioFinal > 0 ? precioFinal : 0 };
        } else {
          const { precioFinal, ...rest } = producto as any;
          return rest as Product;
        }
      } else {
        const { precioFinal, ...rest } = producto as any;
        return rest as Product;
      }
    });
  }

  // ── Cargar catálogo con N productos ─────────────────────
  cargarCatalogo(): void {
    const cantidad = this.countControl.value || 200;
    this.loadTime = null;
    this.processingTime = null;

    console.log(`%c[DATA] Solicitando generación de ${cantidad} productos...`, 'color: #3D9E8C; font-weight: bold');

    const start = performance.now();
    this.catalogoService.recargarCatalogo(cantidad);
    const end = performance.now();

    this.loadTime = parseFloat((end - start).toFixed(3));
    console.log(`%c[DATA] Generación completada en ${this.loadTime}ms`, 'color: #3D9E8C');

    // Re-aplica descuentos al nuevo catálogo
    setTimeout(() => this.triggerDescuento(), 0);
  }

  // Calcula el background del slider con fill proporcional al valor
  getSliderBg(value: number | null | undefined, max: number, fillColor: string): string {
    const pct = (((value ?? 0) / max) * 100).toFixed(2);
    return `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${pct}%, var(--surface-3) ${pct}%, var(--surface-3) 100%)`;
  }

  // Cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.worker) this.worker.terminate();
  }
}
