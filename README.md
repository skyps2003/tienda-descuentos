# 🛍️ Tienda Descuentos - Documentación Técnica

## 📋 Índice
1. [Versión Simple](#-versión-simple-30-segundos)
2. [Arquitectura Completa](#-arquitectura-completa)
3. [Conceptos Técnicos Detallados](#-conceptos-técnicos-detallados)
4. [Estructura del Proyecto](#-estructura-del-proyecto)
5. [Flujo de Datos](#-flujo-completo-de-datos)

---

## 🚀 Versión Simple (30 segundos)

### ¿Qué es este proyecto?
Una tienda online con:
- **200 productos** con búsqueda, filtros y ordenamiento
- **Aplicar descuentos** por categoría sin bloquear la UI
- **Actualizaciones automáticas** (cambios en tiempo real)
- **Procesamiento rápido** en segundo plano

### ¿Cómo funciona?
```
1. Admin: Selecciona categoría + descuento
2. Sistema: Envía datos al Worker (thread)
3. Worker: Calcula descuentos en paralelo (sin bloquear UI)
4. Resultado: Pantalla se actualiza automáticamente
```

### Quick Start
```bash
npm install
npm start
# Abre http://localhost:4200
```

---

## 🏗️ Arquitectura Completa

### Capas de la aplicación

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTACIÓN (Angular)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ClienteComponent      │      AdminComponent     │   │
│  │  (Búsqueda, Filtros)   │  (Aplicar Descuentos)   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────────────────────────────────────────────┐
│             LÓGICA (Servicios + Observables)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │       CatalogoService (RxJS)                      │   │
│  │  - BehaviorSubject (catalogo$, categorias$)      │   │
│  │  - Comunicación reactiva                         │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────────────────────────────────────────────┐
│        PROCESAMIENTO (Web Workers - Multihilo)          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  descuentos.worker.ts (Thread secundario)        │   │
│  │  - Calcula descuentos en paralelo                │   │
│  │  - No bloquea el hilo principal (UI)             │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Conceptos Técnicos Detallados

### 1️⃣ **Fetch / HttpClient (APIs)**

#### ¿Qué es?
Formas de comunicarse con servidores para obtener/enviar datos.

```typescript
// HttpClient en CatalogoService
constructor(private http: HttpClient) { }

// Ejemplo: podría ser usado así (actualmente es mock)
// this.http.get('/api/products').subscribe(data => {
//   this.catalogoSubject.next(data);
// });
```

#### En nuestro proyecto:
- ✅ HttpClient está inyectado en `CatalogoService`
- ✅ Devuelve **Observables** (no Promises)
- ✅ Se integra perfectamente con RxJS
- ✅ Permite encadenamiento de operadores

#### Comparación:
| Aspecto | Fetch | HttpClient |
|---------|-------|-----------|
| Nativo | ✅ Sí | ❌ Angular |
| Devuelve | Promise | Observable |
| Headers | Manual | Automático |
| Interceptores | ❌ No | ✅ Sí |
| Sintaxis | `.then()` | `.subscribe()` |

---

### 2️⃣ **Observables (RxJS)**

#### ¿Qué es?
Un patrón que **emite datos a lo largo del tiempo**. Los componentes "escuchan" cambios automáticamente.

#### En nuestro proyecto:

**CatalogoService (servicio = cerebro reactivo):**
```typescript
// BehaviorSubject: almacena último valor + emite a nuevos suscriptores
private catalogoSubject = new BehaviorSubject<Product[]>([]);
public catalogo$: Observable<Product[]> = this.catalogoSubject.asObservable();

// Cuando hay nuevos datos:
public actualizarCatalogo(catalogoProcesado: Product[]): void {
  this.catalogoSubject.next(catalogoProcesado);  // ← Emite cambio
}
```

**ClienteComponent (suscriptor 1: búsqueda y filtros):**
```typescript
// Escucha múltiples Observables simultáneamente
this.filteredCatalogo$ = combineLatest([
  this.catalogoService.catalogo$,    // Catálogo (con descuentos)
  search$,                           // Cambios de búsqueda
  categoria$,                        // Cambios de categoría
  sort$,                             // Cambios de ordenamiento
  price$                             // Cambios de precio
]).pipe(
  map(([productos, searchTerm, ...]) => {
    // Filtra automáticamente cuando CUALQUIER valor cambia
    return filtrados;
  })
);
```

**AdminComponent (suscriptor 2: gestión de descuentos):**
```typescript
// Escucha cambios del formulario
this.filterForm.valueChanges
  .pipe(
    debounceTime(400),              // Espera 400ms (no cada keystroke)
    distinctUntilChanged(),         // Solo si realmente cambió
    takeUntil(this.destroy$)        // Cleanup automático
  )
  .subscribe(value => {
    // Envía al Worker
    this.worker.postMessage(value);
  });
```

#### Operadores RxJS usados:

| Operador | Propósito | En proyecto |
|----------|----------|-----------|
| `combineLatest()` | Combina múltiples Observables | ClienteComponent |
| `map()` | Transforma datos | ClienteComponent |
| `debounceTime()` | Espera inactividad | AdminComponent |
| `distinctUntilChanged()` | Solo cambios reales | AdminComponent |
| `takeUntil()` | Cleanup automático | AdminComponent |
| `startWith()` | Valor inicial | ClienteComponent |
| `asObservable()` | Convierte Subject a Observable | CatalogoService |

---

### 3️⃣ **Hilos (Threads) - El Problema**

#### ¿Cuál es el problema?
JavaScript es **single-threaded** (un solo hilo):

```
HILO PRINCIPAL
│
├─ Procesar 200 productos (LENTÍSIMO)
│  └─ BLOQUEA TODO
│
├─ (esperando...)
├─ (esperando...)
└─ UI CONGELADA ❌

Mientras espera:
- No responde a clicks
- No anima la pantalla
- No puede hacer nada
```

#### Impacto en UX:
- ⏳ Slider congelado
- 😞 "La app está lenta"
- 📊 Mala experiencia

#### ¿Por qué pasa?
JavaScript ejecuta todo **secuencialmente en un solo carril**. No puede paralelizar.

---

### 4️⃣ **Web Workers (La Solución Multihilo)**

#### ¿Qué es?
Crear **hilos secundarios** que corren en paralelo sin bloquear la UI.

#### Arquitectura con Workers:

```
HILO PRINCIPAL (UI)              HILO SECUNDARIO (Worker)
│                                │
├─ Responde a clicks ✅          ├─ Procesa 200 productos
├─ Anima pantalla ✅             ├─ Calcula descuentos
├─ Actualiza display ✅          └─ Envía resultado
└─ Escucha cambios ✅
```

#### En nuestro proyecto:

**Crear el Worker (AdminComponent):**
```typescript
ngOnInit(): void {
  // Instanciar el Worker
  this.worker = new Worker(
    new URL('../../workers/descuentos.worker', import.meta.url)
  );

  // Escuchar resultados del Worker
  this.worker.onmessage = ({ data }) => {
    this.catalogoService.actualizarCatalogo(data);
  };
}
```

**Enviar datos al Worker:**
```typescript
// Main Thread → Worker Thread (comunicación via postMessage)
this.worker.postMessage({
  catalogoOriginal: [200 productos],
  porcentajeDescuento: 20,
  categoriaSeleccionada: 'electrónica'
});
```

**El Worker procesa (descuentos.worker.ts):**
```typescript
// Escucha mensajes del Thread principal
addEventListener('message', ({ data }) => {
  // Procesa 200 productos SIN bloquear UI
  const catalogoProcesado = data.catalogoOriginal.map(producto => {
    // Calcula descuento
    return { ...producto, precioFinal: newPrice };
  });

  // Worker Thread → Main Thread (resultado de vuelta)
  postMessage(catalogoProcesado);
});
```

#### Comparación: Single-thread vs Multi-thread

**❌ Sin Web Worker:**
```
Usuario cambia descuento
         ↓
   [PROCESAMIENTO LENTO]
   UI congelada 🔴
         ↓
   (Espera...)
   (500ms después)
         ↓
Pantalla se actualiza
```

**✅ Con Web Worker:**
```
Usuario cambia descuento
         ↓
   [Main Thread]              [Worker Thread]
   UI responde ✅             Procesa en paralelo
   Sigue interactivo          (500ms en background)
         ↓
Pantalla se actualiza (SIN lag)
```

#### Limitaciones:
- ⚠️ No puede acceder al **DOM**
- ⚠️ No comparte memoria (solo mensajes)
- ⚠️ Overhead de creación (no para operaciones simples)
- ⚠️ Navegadores muy antiguos no lo soportan

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── services/
│   │   └── catalogo.service.ts ⭐
│   │       ├── BehaviorSubject: catalogo$, categorias$
│   │       ├── Gestiona estado global reactivo
│   │       └── Centro de comunicación entre componentes
│   │
│   ├── components/
│   │   ├── cliente/ ⭐
│   │   │   ├── cliente.component.ts
│   │   │   │   ├── combineLatest (5 Observables)
│   │   │   │   ├── map (filtrado + ordenamiento)
│   │   │   │   └── Modal de producto
│   │   │   └── cliente.component.html
│   │   │
│   │   └── admin/ ⭐
│   │       ├── admin.component.ts
│   │       │   ├── Crea Web Worker
│   │       │   ├── worker.postMessage() envía datos
│   │       │   ├── worker.onmessage escucha resultados
│   │       │   └── debounceTime + distinctUntilChanged
│   │       └── admin.component.html
│   │
│   ├── workers/
│   │   └── descuentos.worker.ts ⭐
│   │       ├── addEventListener('message') recibe
│   │       ├── Mapea 200 productos en paralelo
│   │       └── postMessage() devuelve resultados
│   │
│   └── app.component.ts (Router)
│
└── main.ts (Bootstrap)

⭐ = Conceptos clave documentados en el código
```

---

## 🔄 Flujo Completo de Datos

### Paso a paso:

```
1️⃣ Admin selecciona:
   - Categoría: "Electrónica"
   - Descuento: 20%
   
   ↓

2️⃣ AdminComponent escucha (FormGroup.valueChanges)
   
   ↓

3️⃣ Operadores RxJS:
   - debounceTime(400): Espera 400ms de inactividad
   - distinctUntilChanged(): Verifica que cambió
   
   ↓

4️⃣ worker.postMessage() envía al Worker:
   {
     catalogoOriginal: [200 productos],
     porcentajeDescuento: 20,
     categoriaSeleccionada: "Electrónica"
   }
   
   ↓

5️⃣ Web Worker (Thread secundario):
   - Procesa EN PARALELO (no bloquea UI)
   - Mapea 200 productos
   - Calcula: precioFinal = price - (price * 0.20)
   - Resultado: catálogo con descuentos
   
   ↓

6️⃣ Worker.postMessage() devuelve:
   catalogoProcesado (200 productos con precios actualizados)
   
   ↓

7️⃣ AdminComponent recibe en worker.onmessage
   
   ↓

8️⃣ catalogoService.actualizarCatalogo(data)
   
   ↓

9️⃣ BehaviorSubject emite:
   catalogoSubject.next(data)
   ← Avisa a TODOS los suscriptores
   
   ↓

🔟 ClienteComponent recibe en combineLatest
   
   ↓

1️⃣1️⃣ map() filtra + ordena:
   - Ya tiene datos con descuentos
   - Aplica filtros de búsqueda/precio
   - Ordena por criterio seleccionado
   
   ↓

1️⃣2️⃣ Vista actualiza automáticamente ✅
   - Sin recargar página
   - Sin delay perceptible
   - Con animaciones fluidas
```

---

## ⚙️ Optimizaciones Implementadas

```typescript
// 1. debounceTime(400)
// Problema: Usuario mueve slider → cálculo cada pixel
// Solución: Esperar 400ms de inactividad
✅ Reduce cálculos innecesarios

// 2. distinctUntilChanged()
// Problema: Emite aunque valores sean iguales
// Solución: Solo procesar si realmente cambió
✅ Evita procesamiento duplicado

// 3. Web Worker
// Problema: Cálculos bloquean UI
// Solución: Procesamiento en Thread secundario
✅ UI siempre responsiva

// 4. takeUntil(this.destroy$)
// Problema: Memory leak si componente se destruye
// Solución: Cleanup automático
✅ Evita pérdida de memoria

// 5. startWith('')
// Problema: Espera primer cambio para emitir
// Solución: Emitir valor inicial inmediatamente
✅ UI lista al instante
```

---

## 📊 Comparativa: Conceptos

| Concepto | Usa en | Beneficio |
|----------|--------|----------|
| **HttpClient** | CatalogoService | Peticiones reactivas (Observables) |
| **BehaviorSubject** | CatalogoService | Estado compartido entre componentes |
| **combineLatest** | ClienteComponent | Filtrado reactivo de 5 fuentes |
| **debounceTime** | AdminComponent | Optimización de cálculos |
| **Web Worker** | AdminComponent | Procesamiento paralelo |
| **takeUntil** | AdminComponent | Cleanup automático |

---

## 🎯 Resumen por Archivo

### `catalogo.service.ts` 📡
**Rol:** Servicio central (cerebro)
- Almacena catálogo original
- Emite cambios vía BehaviorSubject
- Comunica componentes sin acoplamiento

### `cliente.component.ts` 🛒
**Rol:** Vista de cliente
- Escucha 5 Observables simultáneamente
- Filtra por búsqueda, categoría, precio
- Ordena por criterio
- Modal de producto

### `admin.component.ts` ⚙️
**Rol:** Vista de administrador
- Crea Web Worker
- Envía datos al Worker
- Escucha resultados
- Debounce + cleanup

### `descuentos.worker.ts` 🧵
**Rol:** Procesador paralelo
- Recibe datos del Thread principal
- Calcula descuentos (200 productos)
- Devuelve resultados
- Corre en Thread secundario

---

## 📚 Recursos para aprender

- [RxJS Documentación](https://rxjs.dev/)
- [Angular HttpClient](https://angular.io/guide/http)
- [Web Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Observable Operators](https://rxjs.dev/api)
- [JavaScript Concurrency](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

---

## 🚀 Próximas Mejoras

```typescript
// [ ] HttpClient real: http.get('/api/products')
// [ ] Error handling en Worker
// [ ] SharedArrayBuffer para mejor performance
// [ ] Pruebas unitarias (jasmine)
// [ ] Cache con shareReplay()
// [ ] Virtual scrolling para 1000+ productos
// [ ] Progressive Web App (PWA)
// [ ] Service Worker para offline
```

---

## 📦 Requisitos

- Node.js LTS (v18+)
- npm o pnpm
- Angular 17+
- TypeScript 5+

---

## 🏃 Quick Start

```bash
# Instalar
npm install

# Desarrollar
npm start

# Build producción
npm run build

# Pruebas
npm test
```

---

**Creado con ❤️ — Angular + RxJS + Web Workers**

*Repositorio original: https://github.com/skyps2003/tienda-descuentos.git*
