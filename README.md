# 🛍️ Tienda Descuentos - Documentación Técnica y Arquitectura

Bienvenido a la documentación oficial del proyecto **Tienda Descuentos**. Esta aplicación es una demostración técnica avanzada de alto rendimiento, construida con Angular, diseñada para probar el manejo de datos masivos en el frontend utilizando paralelismo.

## 📋 Índice
1. [Características Principales](#-características-principales)
2. [Versión Simple (Resumen)](#-versión-simple-resumen)
3. [Arquitectura Completa](#-arquitectura-completa)
4. [Conceptos Técnicos Detallados](#-conceptos-técnicos-detallados)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Flujo Completo de Datos](#-flujo-completo-de-datos)

---

## ✨ Características Principales

### 1. Motor de Descuentos Paralelizado (Web Workers)
- Capacidad para procesar **hasta 100,000 productos simultáneamente**.
- Interfaz gráfica para comparar en tiempo real el rendimiento entre el **Hilo Principal** (que congela el navegador) y un **Web Worker** (que mantiene la UI a 60FPS).
- Input numérico personalizado para el benchmark de estrés.

### 2. Motor de Visualización Avanzado (Flexbox/Grid)
El catálogo de productos incluye **5 modos de vista en tiempo real** que mutan al instante sin recargar el DOM gracias al sistema reactivo:
- ⊞ **Cuadrícula (Estándar):** Grid clásico balanceado.
- 𝌆 **Lista (Detallada):** Tarjetas horizontales de ancho completo.
- ▦ **Compacta (Alta densidad):** Ideal para escanear cientos de ítems.
- ▤ **Mosaico (Pinterest):** Columnas mampostería (`column-count`).
- ☰ **Tabla (Datos):** Filas ultracompactas orientadas a analítica.

### 3. Sistema de Filtrado Reactivo (RxJS)
El cliente incluye una cascada de filtros súper rápidos impulsados por `combineLatest`:
- **Categorías** (10 opciones interactivas).
- **Rango de Precios** dinámico.
- Búsqueda en texto libre y ordenamiento multidimensional.
- **Toggle Inteligente "Solo Ofertas"** que evalúa instantáneamente los descuentos aplicados por el Administrador.

### 4. Sistema Global de Temas (Dark/Light Mode)
- Interruptor de sol y luna con micro-animaciones premium, posicionado globalmente.
- Gestión de paletas de colores complejas a través de variables CSS nativas (`--bg-body`, `--surface-1`).

---

## 🚀 Versión Simple (Resumen)

### ¿Qué es este proyecto?
Es una tienda online que simula un catálogo inmenso. El objetivo principal es demostrar que **aplicar cálculos pesados (como descuentos en masa) no tiene por qué arruinar la experiencia del usuario (UX)** si se usa la arquitectura correcta.

### ¿Cómo funciona?
```text
1. Admin: Selecciona categoría + porcentaje de descuento.
2. Sistema: Envía los miles de datos al Worker (hilo secundario).
3. Worker: Calcula los descuentos en paralelo (la interfaz no se bloquea).
4. Cliente: La pantalla se actualiza reactivamente al vuelo.
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

```text
┌─────────────────────────────────────────────────────────┐
│              PRESENTACIÓN (Angular)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ClienteComponent      │      AdminComponent     │   │
│  │  (Filtros, 5 Vistas)   │  (Benchmark, Descuentos)│   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌─────────────────────────────────────────────────────────┐
│             LÓGICA (Servicios + Observables)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │       CatalogoService (RxJS)                     │   │
│  │  - BehaviorSubject (catalogo$, categorias$)      │   │
│  │  - Comunicación reactiva                         │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌─────────────────────────────────────────────────────────┐
│        PROCESAMIENTO (Web Workers - Multihilo)          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  descuentos.worker.ts (Thread secundario)        │   │
│  │  - Calcula precios finales en paralelo           │   │
│  │  - Benchmark masivo sin bloquear la UI           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Conceptos Técnicos Detallados

### 1️⃣ Observables (RxJS)

Un patrón que **emite datos a lo largo del tiempo**. Los componentes "escuchan" cambios automáticamente en vez de solicitarlos manualmente (Programación Reactiva).

**CatalogoService (Cerebro Reactivo):**
Utiliza `BehaviorSubject` para mantener el último estado conocido del catálogo y emitirlo a nuevos suscriptores al instante.

**ClienteComponent (Suscriptor de filtros):**
Utiliza el operador avanzado `combineLatest` para escuchar hasta 6 filtros a la vez (Buscador, Precios, Categorías, Solo Ofertas, Orden y Catálogo) y renderizar instantáneamente el resultado de la intersección.

### 2️⃣ Web Workers (Multihilo en JS)

JavaScript por defecto es **single-threaded** (un solo hilo). Si bloqueas ese hilo procesando 25,000 productos, el navegador se "congela" (no puedes scrollear ni clicar).

**La Solución Web Worker:**
Sacamos la lógica pesada a un subproceso del sistema operativo.
1. El Hilo Principal (UI) envía un mensaje al Worker usando `postMessage()`.
2. El Worker procesa en la sombra sin molestar a la UI.
3. Al terminar, el Worker devuelve los datos actualizados mediante el evento `onmessage`.

---

## 📁 Estructura del Proyecto

```text
src/
├── app/
│   ├── services/
│   │   └── catalogo.service.ts ⭐ (Estado global reactivo y mock de API)
│   │
│   ├── components/
│   │   ├── cliente/ ⭐
│   │   │   ├── cliente.component.ts (Lógica de filtrado combineLatest)
│   │   │   └── cliente.component.html (Vistas dinámicas CSS, Modal)
│   │   │
│   │   └── admin/ ⭐
│   │       ├── admin.component.ts (Gestión del Web Worker, Benchmark inputs)
│   │       └── admin.component.html (Dashboard de stress, Theme switch)
│   │
│   ├── workers/
│   │   └── descuentos.worker.ts ⭐ (Procesamiento matemático paralelo)
│   │
│   └── app.component.ts (Contenedor raíz)
│
└── styles.css (Sistema de diseño premium, utilidades, Dark Mode nativo)
```

---

## 🔄 Flujo Completo de Datos (Paso a Paso)

```text
1️⃣ Admin aplica cambios:
   - Configura carga de 25,000 productos.
   - Aplica 50% de descuento a "Electrónica".
   
2️⃣ Control Reactivo:
   - Los FormControl emiten usando debounceTime() para evitar sobrecarga.
   
3️⃣ worker.postMessage():
   - Se serializa el catálogo de 25k productos y se envía al Worker.
   
4️⃣ Web Worker calcula:
   - Mapea el arreglo inmenso, detecta qué productos son de Electrónica,
   - inyecta el `precioFinal` con el descuento calculado. Todo esto mientras
   - el Hilo Principal sigue dibujando animaciones a 60 FPS.
   
5️⃣ Worker responde:
   - Devuelve el catálogo procesado mediante postMessage().
   
6️⃣ Servicio Centraliza:
   - catalogoService.actualizarCatalogo() emite los nuevos datos vía BehaviorSubject.
   
7️⃣ Pantalla del Cliente:
   - El combineLatest del cliente recibe la inyección.
   - Mantiene activos los filtros del cliente (ej. "Solo Ofertas").
   - El DOM se repinta instantáneamente usando la Vista Activa (Cuadrícula, Tabla, etc).
```
