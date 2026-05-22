# Tienda de Descuentos

Aplicación web en Angular para gestionar un catálogo de productos y aplicar descuentos mediante Web Workers.

## Descripción

Tienda de Descuentos es una aplicación front-end construida con Angular y TypeScript que permite:

- Gestionar un catálogo de productos.
- Aplicar y calcular descuentos usando Web Workers.
- Ofrecer vistas separadas para administradores y clientes.
- Contar con un servicio de catálogo y componentes organizados por función.

Repositorio original: https://github.com/skyps2003/tienda-descuentos.git

## Requisitos

- Node.js (LTS recomendado)
- npm o pnpm

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm start
```

## Estructura relevante

- `src/app/components/` — componentes de la aplicación (administrador, cliente)
- `src/app/services/` — servicios (ej. `catalogo.service.ts`)
- `src/workers/` — Web Workers para cálculo de descuentos

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE`.

## Contribuciones

Si quieres contribuir, abre un issue o envía un pull request. Añade pruebas cuando sea posible.

## Commit sugerido

`feat: subida inicial del proyecto "Tienda de Descuentos" (Angular)`
# Tienda de Descuentos - Conceptos Clave

Este documento es una guía concisa para entender las tecnologías y conceptos avanzados utilizados en esta aplicación: **Fetch (APIs)**, **Observables**, **Hilos (Threads)** y **Web Workers**.

---

## 1. Uso de APIs (Fetch / HttpClient)

Una **API** (Interfaz de Programación de Aplicaciones) es como un mesero en un restaurante: tú (la aplicación cliente) le pides un dato, el mesero va a la cocina (el servidor), y te trae la comida (los datos).

*   **Fetch:** Es la función nativa de JavaScript para hacer estas peticiones a través de internet (ej. traer una lista de productos desde `fakestoreapi.com`).
*   **En Angular:** Normalmente usamos `HttpClient`, que es una versión mejorada de Fetch. Nos permite hacer peticiones GET, POST, PUT, DELETE y automáticamente convierte las respuestas (que vienen en texto/JSON) en objetos de JavaScript que podemos usar en nuestro código.

---

## 2. Observables (RxJS)

Imagina un `Array` tradicional como un vaso de agua: tiene una cantidad fija y ya está ahí. Un **Observable**, en cambio, es como un **grifo de agua abierto** (un flujo o *stream*).

*   **¿Qué es?** Es un canal por el cual viajan datos a lo largo del tiempo.
*   **¿Para qué sirve?** En lugar de preguntar "oye, ¿cambió el dato?", simplemente te **suscribes** al observable. Cada vez que el dato cambia (por ejemplo, cuando el usuario mueve el slider de descuento o cuando llega nueva información del servidor), el Observable "avisa" automáticamente a todos los suscritos.
*   **En este proyecto:** Usamos Observables (`catalogo$`) para que, en el instante en que el Web Worker calcula un nuevo descuento, la pantalla del cliente se actualice mágicamente sola, sin tener que recargar la página.

---

## 3. Hilos (Threads) y el problema de JavaScript

Un **Hilo (Thread)** es como un carril de una autopista por donde viajan las tareas que debe ejecutar el procesador de tu computadora.

*   **El problema:** JavaScript es de **un solo hilo** (Single-threaded). Esto significa que tiene un solo "trabajador". Si le pides a ese trabajador que haga un cálculo matemático súper complejo (como calcular descuentos para miles de productos), no podrá hacer nada más al mismo tiempo. 
*   **La consecuencia:** La pantalla se **congela** (bloquea). El usuario no podrá hacer clic en botones, ni escribir, ni hacer scroll hasta que el cálculo termine.

---

## 4. Web Workers (La Solución Multihilo)

Para solucionar el problema de la pantalla congelada, HTML5 introdujo los **Web Workers**.

*   **¿Qué son?** Son "trabajadores adicionales" (hilos en segundo plano o *background threads*) que JavaScript puede contratar.
*   **¿Cómo funcionan?** 
    1.  El hilo principal (que controla la pantalla/UI) le envía un "mensaje" al Web Worker con los datos crudos (ej. "Toma estos 200 productos y aplícales un 20% de descuento").
    2.  El hilo principal queda libre para seguir escuchando clics del usuario y animando la página.
    3.  El Web Worker hace todo el trabajo pesado matemáticamente en "las sombras".
    4.  Cuando termina, el Web Worker le envía un mensaje de vuelta al hilo principal: "¡Listo! Aquí están los productos con los precios actualizados".
*   **En este proyecto:** Cuando mueves el slider, estamos recalculando 200 productos de forma intensiva. Gracias al Web Worker (`descuentos.worker.ts`), la animación del slider sigue siendo fluida a 60 frames por segundo, dando una experiencia de Usuario (UX) increíblemente rápida y premium.
