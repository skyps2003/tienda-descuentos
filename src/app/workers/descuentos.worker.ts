/// <reference lib="webworker" />
import { Product } from '../services/catalogo.service';

interface WorkerPayload {
  catalogoOriginal: Product[];
  porcentajeDescuento: number;
  categoriaSeleccionada: string;
}

addEventListener('message', ({ data }) => {
  const { catalogoOriginal, porcentajeDescuento, categoriaSeleccionada } = data as WorkerPayload;

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

  postMessage(catalogoProcesado);
});
