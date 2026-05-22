import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { CatalogoService, Product } from '../../services/catalogo.service';
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
  
  public searchControl = new FormControl('');
  public categoriaControl = new FormControl('Todas');
  public sortControl = new FormControl('relevancia');
  public priceGroup = new FormGroup({
    min: new FormControl<number | null>(null),
    max: new FormControl<number | null>(null)
  });
  
  public categorias$ = this.catalogoService.categorias$;
  public filteredCatalogo$!: Observable<Product[]>;
  public selectedProduct: Product | null = null; // Modal State

  ngOnInit(): void {
    const search$ = this.searchControl.valueChanges.pipe(startWith(''));
    const categoria$ = this.categoriaControl.valueChanges.pipe(startWith('Todas'));
    const sort$ = this.sortControl.valueChanges.pipe(startWith('relevancia'));
    const price$ = this.priceGroup.valueChanges.pipe(startWith({ min: null, max: null }));

    this.filteredCatalogo$ = combineLatest([
      this.catalogoService.catalogo$,
      search$,
      categoria$,
      sort$,
      price$
    ]).pipe(
      map(([productos, searchTerm, categoria, sortOrder, priceRange]) => {
        let filtrados = productos;
        
        // Filtrar por Categoría
        if (categoria && categoria !== 'Todas') {
          filtrados = filtrados.filter(p => p.category === categoria);
        }
        
        // Filtrar por Búsqueda
        if (searchTerm && searchTerm.trim() !== '') {
          const lowerTerm = searchTerm.toLowerCase();
          filtrados = filtrados.filter(p => p.title.toLowerCase().includes(lowerTerm) || p.description.toLowerCase().includes(lowerTerm));
        }

        // Filtrar por Precio
        if (priceRange.min !== null && priceRange.min !== undefined) {
          filtrados = filtrados.filter(p => (p.precioFinal ?? p.price) >= priceRange.min!);
        }
        if (priceRange.max !== null && priceRange.max !== undefined && priceRange.max > 0) {
          filtrados = filtrados.filter(p => (p.precioFinal ?? p.price) <= priceRange.max!);
        }

        // Ordenamiento
        if (sortOrder === 'menor-mayor') {
          filtrados = filtrados.sort((a, b) => (a.precioFinal ?? a.price) - (b.precioFinal ?? b.price));
        } else if (sortOrder === 'mayor-menor') {
          filtrados = filtrados.sort((a, b) => (b.precioFinal ?? b.price) - (a.precioFinal ?? a.price));
        } else if (sortOrder === 'rating') {
          filtrados = filtrados.sort((a, b) => b.rating.rate - a.rating.rate);
        }
        
        return filtrados;
      })
    );
  }

  // Modal Methods
  openModal(product: Product): void {
    this.selectedProduct = product;
    document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
  }

  closeModal(): void {
    this.selectedProduct = null;
    document.body.style.overflow = '';
  }

  getRatingArray(rate: number): number[] {
    return Array(Math.round(rate)).fill(0);
  }
}
