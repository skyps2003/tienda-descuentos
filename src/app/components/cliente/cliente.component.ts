import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { CatalogoService, Product } from '../../services/catalogo.service';
// ==========================================
// OBSERVABLES (RxJS): Patrón reactivo
// ==========================================
// combineLatest: combina múltiples Observables en uno
// startWith: emite valor inicial antes de cambios
// map: transforma datos en el pipeline
// Observable: flujo de datos asíncronos
// ==========================================
import { combineLatest, startWith, map, Observable } from 'rxjs';

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cliente.component.html',
  styleUrls: ['./cliente.component.css']
})
export class ClienteComponent implements OnInit {
  private catalogoService = inject(CatalogoService);

  // Controles de filtrado reactivos: vinculados automáticamente a la UI
  public searchControl = new FormControl('');
  public categoriaControl = new FormControl('Todas');
  public sortControl = new FormControl('relevancia');
  public viewControl = new FormControl('grid');
  public onlyDiscountsControl = new FormControl(false);
  public priceGroup = new FormGroup({
    min: new FormControl<number | null>(null),
    max: new FormControl<number | null>(null)
  });

  // Observable de categorías: emitido por el servicio
  public categorias$ = this.catalogoService.categorias$;
  // Observable filtrado: resultado final del pipeline reactivo
  public filteredCatalogo$!: Observable<Product[]>;
  public selectedProduct: Product | null = null;

  ngOnInit(): void {
    // ==========================================
    // COMBINACIÓN DE OBSERVABLES: Pipeline reactivo
    // ==========================================
    // Cada cambio de búsqueda, categoría, ordenamiento o precio triggeriza filtrado automático
    const search$ = this.searchControl.valueChanges.pipe(startWith(''));
    const categoria$ = this.categoriaControl.valueChanges.pipe(startWith('Todas'));
    const sort$ = this.sortControl.valueChanges.pipe(startWith('relevancia'));
    const price$ = this.priceGroup.valueChanges.pipe(startWith({ min: null, max: null }));
    const onlyDiscounts$ = this.onlyDiscountsControl.valueChanges.pipe(startWith(false));

    // combineLatest: espera a que todos los Observables emitan, luego combina valores
    // Actúa como un "listener" que ejecuta cuando CUALQUIER valor cambia
    this.filteredCatalogo$ = combineLatest([
      this.catalogoService.catalogo$,  // Catálogo del servicio (incluyendo descuentos del Worker)
      search$,
      categoria$,
      sort$,
      price$,
      onlyDiscounts$
    ]).pipe(
      // map: transformar [catálogo, búsqueda, categoría, ordenamiento, precio, soloDescuentos] → catálogo filtrado
      map(([productos, searchTerm, categoria, sortOrder, priceRange, onlyDiscounts]) => {
        let filtrados = productos;

        // 0. Filtrar Solo Ofertas
        if (onlyDiscounts) {
          filtrados = filtrados.filter(p => p.precioFinal !== undefined && p.precioFinal !== null && p.precioFinal < p.price);
        }

        // 1. Filtrar por Categoría
        if (categoria && categoria !== 'Todas') {
          filtrados = filtrados.filter(p => p.category === categoria);
        }

        // 2. Filtrar por Búsqueda (en título y descripción)
        if (searchTerm && searchTerm.trim() !== '') {
          const lowerTerm = searchTerm.toLowerCase();
          filtrados = filtrados.filter(p =>
            p.title.toLowerCase().includes(lowerTerm) ||
            p.description.toLowerCase().includes(lowerTerm)
          );
        }

        // 3. Filtrar por Rango de Precio (mínimo)
        if (priceRange.min !== null && priceRange.min !== undefined) {
          filtrados = filtrados.filter(p => (p.precioFinal ?? p.price) >= priceRange.min!);
        }
        // Filtrar por Rango de Precio (máximo)
        if (priceRange.max !== null && priceRange.max !== undefined && priceRange.max > 0) {
          filtrados = filtrados.filter(p => (p.precioFinal ?? p.price) <= priceRange.max!);
        }

        // 4. Ordenamiento (menor-mayor, mayor-menor, rating)
        if (sortOrder === 'menor-mayor') {
          filtrados = filtrados.sort((a, b) => (a.precioFinal ?? a.price) - (b.precioFinal ?? b.price));
        } else if (sortOrder === 'mayor-menor') {
          filtrados = filtrados.sort((a, b) => (b.precioFinal ?? b.price) - (a.precioFinal ?? a.price));
        } else if (sortOrder === 'rating') {
          filtrados = filtrados.sort((a, b) => b.rating.rate - a.rating.rate);
        }

        // Retorna catálogo filtrado y ordenado
        return filtrados;
      })
    );
  }

  // Resetea todos los filtros de búsqueda a sus valores iniciales
  resetFilters(): void {
    this.searchControl.setValue('');
    this.categoriaControl.setValue('Todas');
    this.sortControl.setValue('relevancia');
    this.onlyDiscountsControl.setValue(false);
    this.priceGroup.setValue({ min: null, max: null });
  }

  // Modal: abre detalle del producto
  openModal(product: Product): void {
    this.selectedProduct = product;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.selectedProduct = null;
    document.body.style.overflow = '';
  }

  getRatingArray(rate: number): number[] {
    return Array(Math.round(rate)).fill(0);
  }

  isStarFilled(rate: number, index: number): boolean {
    return index <= Math.round(rate);
  }
}
