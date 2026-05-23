import { Injectable } from '@angular/core';
// HttpClient: API para realizar peticiones HTTP (GET, POST, etc.) de forma reactiva
// Se inyecta como dependencia pero puede usarse para fetch() API real
import { HttpClient } from '@angular/common/http';
// RxJS Observables: Patrón reactivo para manejar datos asíncronos
// BehaviorSubject: almacena el último valor y lo emite a nuevos suscriptores
// Observable: flujo de datos que permite suscriptores recibir cambios en tiempo real
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

// @Injectable: Marca la clase como servicio inyectable en Angular
// providedIn: 'root' = disponible globalmente (singleton)
@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private catalogoOriginal: Product[] = [];

  // BehaviorSubject para catálogo: emite cambios cuando hay nuevos datos
  private catalogoSubject = new BehaviorSubject<Product[]>([]);
  // Observable público: los componentes se suscriben para recibir actualizaciones reactivas
  public catalogo$: Observable<Product[]> = this.catalogoSubject.asObservable();

  // BehaviorSubject para categorías: patrón reactivo para filtros
  private categoriasSubject = new BehaviorSubject<string[]>(['Todas']);
  public categorias$: Observable<string[]> = this.categoriasSubject.asObservable();

  constructor(private http: HttpClient) {
    this.cargarCatalogo();
  }

  // Carga el catálogo (en este caso mock, pero podría usar http.get() con Fetch/HttpClient real)
  private cargarCatalogo(): void {
    const categoriasBase = [
      'electrónica', 'joyería', 'ropa de hombre', 'ropa de mujer',
      'calzado', 'hogar', 'deportes', 'belleza', 'juguetes'
    ];
    const mockProducts: Product[] = [];

    let idCounter = 1;
    // Genera ~200 productos simulando un catálogo real
    const itemsPerCategory = Math.ceil(200 / categoriasBase.length);

    for (const cat of categoriasBase) {
      for (let i = 1; i <= itemsPerCategory; i++) {
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

    // Almacenar original: necesario para que el Worker procese desde los datos sin descuentos aplicados
    this.catalogoOriginal = mockProducts;
    // Emitir catálogo a todos los suscriptores del Observable catalogo$
    // Esto triggeriza actualizaciones reactivas en los componentes
    this.catalogoSubject.next(mockProducts);
    this.extraerCategorias(mockProducts);
  }

  // Extrae categorías únicas: usado para poblar el filtro de categorías en el componente
  private extraerCategorias(products: Product[]): void {
    const categorias = [...new Set(products.map(p => p.category))];
    // Emitir nuevas categorías a todos los suscriptores del Observable categorias$
    this.categoriasSubject.next(['Todas', ...categorias]);
  }

  // Actualiza el catálogo reactivamente: cuando el Worker procesa descuentos
  // Esto hace que todos los componentes suscritos reciban automáticamente los nuevos datos
  public actualizarCatalogo(catalogoProcesado: Product[]): void {
    this.catalogoSubject.next(catalogoProcesado);
  }

  public recargarCatalogo(cantidad: number): void {
    const categoriasBase = [
      'electrónica', 'joyería', 'ropa de hombre', 'ropa de mujer',
      'calzado', 'hogar', 'deportes', 'belleza', 'juguetes'
    ];
    const porCategoria = Math.ceil(cantidad / categoriasBase.length);
    const mockProducts: Product[] = [];
    let idCounter = 1;

    for (const cat of categoriasBase) {
      for (let i = 1; i <= porCategoria && mockProducts.length < cantidad; i++) {
        mockProducts.push({
          id: idCounter++,
          title: `Producto de ${cat} ${i} — Calidad Premium`,
          price: parseFloat((Math.random() * (500 - 10) + 10).toFixed(2)),
          description: `Producto de la categoría ${cat}. Ideal para probar el rendimiento con grandes volúmenes de datos.`,
          category: cat,
          image: `https://picsum.photos/seed/${idCounter}/300/300`,
          rating: {
            rate: parseFloat((Math.random() * 5).toFixed(1)),
            count: Math.floor(Math.random() * 500)
          }
        });
      }
    }

    mockProducts.sort(() => Math.random() - 0.5);
    this.catalogoOriginal = mockProducts;
    this.catalogoSubject.next(mockProducts);
    this.extraerCategorias(mockProducts);
  }

  // Retorna el catálogo original sin descuentos
  // El Worker necesita esto para calcular descuentos desde la base correcta
  public getCatalogoOriginal(): Product[] {
    return this.catalogoOriginal;
  }
}
