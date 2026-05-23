/// <reference lib="webworker" />
// ==========================================
// SOLUCIÓN MULTIHILO EN JAVASCRIPT: WEB WORKER
// ==========================================
// PROBLEMA: JavaScript es single-threaded (un solo hilo)
// - Las operaciones pesadas bloquean la UI (congelamiento)
// - Procesar 200+ productos ralentiza la interfaz
//
// SOLUCIÓN: Web Workers = Hilos secundarios en segundo plano
// - Cálculos en paralelo sin bloquear el hilo principal (UI)
// - Comunicación: postMessage() para enviar/recibir datos
// - El Worker corre en su propio contexto aislado
// ==========================================

import { Product } from '../services/catalogo.service';

interface WorkerPayload {
  catalogoOriginal: Product[];
  porcentajeDescuento: number;
  categoriaSeleccionada: string;
}

// addEventListener('message'): Escucha mensajes del hilo principal
// Este Worker recibe: catálogo, descuento y categoría
// Procesa (mapea 200 productos) sin bloquear la UI
addEventListener('message', ({ data }) => {
  const { catalogoOriginal, porcentajeDescuento, categoriaSeleccionada } = data as WorkerPayload;
  console.log(`%c[WORKER] ⚙️ Iniciando cálculo en 2do plano | Elementos: ${catalogoOriginal.length}`, 'color: #3B82F6');
  const t0 = performance.now();

  // Procesamiento intensivo en este hilo secundario
  // No bloquea el UI porque corre en paralelo
  const catalogoProcesado = catalogoOriginal.map(producto => {
    if (categoriaSeleccionada === 'Todas' || producto.category === categoriaSeleccionada) {
      if (porcentajeDescuento && porcentajeDescuento > 0) {
        const factorDescuento = porcentajeDescuento / 100;
        const descuento = producto.price * factorDescuento;
        const precioFinal = parseFloat((producto.price - descuento).toFixed(2));

        return {
          ...producto,
          precioFinal: precioFinal > 0 ? precioFinal : 0
        };
      } else {
        const { precioFinal, ...rest } = producto;
        return rest;
      }
    } else {
      const { precioFinal, ...rest } = producto;
      return rest;
    }
  });

  const t1 = performance.now();
  console.log(`%c[WORKER] ✅ Cálculo interno finalizado en ${(t1 - t0).toFixed(3)}ms. Enviando payload a hilo principal...`, 'color: #3B82F6');
  // postMessage(): Envía resultado al hilo principal
  // El componente admin.component.ts recibe esto en worker.onmessage
  postMessage(catalogoProcesado);
});
