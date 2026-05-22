import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
  precioFinal?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private catalogoOriginal: Product[] = [];
  
  private catalogoSubject = new BehaviorSubject<Product[]>([]);
  public catalogo$: Observable<Product[]> = this.catalogoSubject.asObservable();

  private categoriasSubject = new BehaviorSubject<string[]>(['Todas']);
  public categorias$: Observable<string[]> = this.categoriasSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    const categoriasBase = ['electrónica', 'joyería', 'ropa de hombre', 'ropa de mujer'];
    const mockProducts: Product[] = [];
    
    let idCounter = 1;
    for (const cat of categoriasBase) {
      for (let i = 1; i <= 50; i++) {
        mockProducts.push({
          id: idCounter++,
          title: `Producto de ${cat} ${i} - Calidad Premium`,
          price: parseFloat((Math.random() * (500 - 10) + 10).toFixed(2)),
          description: `Este es un producto de prueba auto-generado para la categoría ${cat}. Ideal para probar el rendimiento del catálogo con muchos ítems. Contiene características detalladas y un acabado excepcional.`,
          category: cat,
          image: `https://picsum.photos/seed/${idCounter}/300/300`,
          rating: {
            rate: parseFloat((Math.random() * 5).toFixed(1)),
            count: Math.floor(Math.random() * 500)
          }
        });
      }
    }

    // Shuffle the array to make it look realistic
    mockProducts.sort(() => Math.random() - 0.5);

    this.catalogoOriginal = mockProducts;
    this.catalogoSubject.next(mockProducts);
    this.extraerCategorias(mockProducts);
  }

  private extraerCategorias(products: Product[]): void {
    const categorias = [...new Set(products.map(p => p.category))];
    this.categoriasSubject.next(['Todas', ...categorias]);
  }

  public actualizarCatalogo(catalogoProcesado: Product[]): void {
    this.catalogoSubject.next(catalogoProcesado);
  }

  public getCatalogoOriginal(): Product[] {
    return this.catalogoOriginal;
  }
}
