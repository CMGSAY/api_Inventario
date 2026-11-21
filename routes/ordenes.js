const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { parseEntero, validarTexto } = require('../validaciones');

// GET /api/ordenes - Lista todas las órdenes activas con sus detalles y producto asociado
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orden')
      .select(`
        ordenid,
        numeroorden,
        cliente,
        total,
        estado,
        activo,
        fechamod,
        detalleorden (
          detalleordenid,
          cantidad,
          total,
          activo,
          fechamod,
          inventarioid,
          ordenid,
          inventario (
            inventarioid,
            existencia,
            precio,
            productoid,
            producto (
              productoid,
              codigo,
              nombre
            )
          )
        )
      `)
      .eq('activo', true)
      .order('fechamod', { ascending: false })
      .order('ordenid', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error en GET /api/ordenes:', err);
    res.status(500).json({ error: 'Error al obtener las órdenes' });
  }
});

// POST /api/ordenes - Crea una nueva orden con múltiples detalles
router.post('/', async (req, res) => {
  try {
    const { cliente, numeroorden, detalles } = req.body;

    const errorCliente = validarTexto(cliente, 'cliente', 100);
    if (errorCliente) {
      return res.status(400).json({ error: errorCliente });
    }

    if (
      numeroorden !== undefined &&
      numeroorden !== null &&
      String(numeroorden).trim().length > 20
    ) {
      return res.status(400).json({
        error: 'El campo numeroorden no puede superar 20 caracteres',
      });
    }

    if (!Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        error: 'Debes enviar un arreglo detalles con al menos un producto',
      });
    }

    const detallesNormalizados = [];
    for (const item of detalles) {
      const invId = item && typeof item === 'object' ? parseEntero(item.inventarioid) : null;
      const cant = item && typeof item === 'object' ? parseEntero(item.cantidad) : null;
      if (invId === null || invId <= 0 || cant === null || cant <= 0) {
        return res.status(400).json({
          error: 'Cada detalle debe incluir inventarioid y cantidad enteros mayores a 0',
        });
      }
      detallesNormalizados.push({ inventarioid: invId, cantidad: cant });
    }

    // Consultar precios actuales de los inventarioid solicitados
    const inventarioIds = [...new Set(detallesNormalizados.map((d) => d.inventarioid))];

    const { data: inventarios, error: invError } = await supabase
      .from('inventario')
      .select('inventarioid, precio, existencia')
      .in('inventarioid', inventarioIds)
      .eq('activo', true);

    if (invError) {
      return res.status(500).json({ error: invError.message });
    }

    const inventarioMap = new Map(
      (inventarios || []).map((inv) => [inv.inventarioid, inv])
    );

    const ahora = new Date().toISOString();
    let totalOrden = 0;
    const detallesPreparados = [];

    for (const item of detallesNormalizados) {
      const invId = item.inventarioid;
      const cantidad = item.cantidad;
      const inv = inventarioMap.get(invId);

      if (!inv) {
        return res.status(404).json({
          error: `No se encontró inventario activo con inventarioid ${invId}`,
        });
      }

      const subtotal = Number((Number(inv.precio) * cantidad).toFixed(2));
      totalOrden = Number((totalOrden + subtotal).toFixed(2));

      detallesPreparados.push({
        inventarioid: invId,
        cantidad,
        total: subtotal,
        activo: true,
        fechamod: ahora,
      });
    }

    const numeroOrdenFinal =
      numeroorden && String(numeroorden).trim()
        ? String(numeroorden).trim()
        : `ORD-${Date.now()}`;

    // Insertar la orden en estado Pendiente
    const { data: ordenCreada, error: ordenError } = await supabase
      .from('orden')
      .insert([
        {
          numeroorden: numeroOrdenFinal,
          cliente: String(cliente).trim(),
          total: totalOrden,
          estado: 'Pendiente',
          activo: true,
          fechamod: ahora,
        },
      ])
      .select()
      .single();

    if (ordenError) {
      return res.status(500).json({ error: ordenError.message });
    }

    // Insertar los detalles de la orden
    const detallesConOrdenId = detallesPreparados.map((d) => ({
      ...d,
      ordenid: ordenCreada.ordenid,
    }));

    const { data: detallesCreados, error: detError } = await supabase
      .from('detalleorden')
      .insert(detallesConOrdenId)
      .select();

    if (detError) {
      // Revertir la orden para no dejar una orden sin detalles
      await supabase.from('orden').delete().eq('ordenid', ordenCreada.ordenid);
      return res.status(500).json({ error: detError.message });
    }

    res.status(201).json({
      ...ordenCreada,
      detalleorden: detallesCreados,
    });
  } catch (err) {
    console.error('Error en POST /api/ordenes:', err);
    res.status(500).json({ error: 'Error al crear la orden' });
  }
});

// PUT /api/ordenes/:id/despachar - Despacha una orden, descuenta inventario y retorna alertasStockBajo
router.put('/:id/despachar', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de orden inválido' });
    }

    // Obtener la orden con sus detalles e inventario/producto
    const { data: orden, error: ordenError } = await supabase
      .from('orden')
      .select(`
        ordenid,
        numeroorden,
        cliente,
        total,
        estado,
        activo,
        fechamod,
        detalleorden (
          detalleordenid,
          cantidad,
          total,
          inventarioid,
          inventario (
            inventarioid,
            existencia,
            precio,
            productoid,
            producto (
              productoid,
              codigo,
              nombre
            )
          )
        )
      `)
      .eq('ordenid', id)
      .eq('activo', true)
      .maybeSingle();

    if (ordenError) {
      return res.status(500).json({ error: ordenError.message });
    }

    if (!orden) {
      return res.status(404).json({ error: `No se encontró la orden con ID ${id}` });
    }

    if (orden.estado !== 'Pendiente') {
      return res.status(400).json({
        error: `La orden no se puede despachar porque su estado actual es "${orden.estado}"`,
      });
    }

    // Agrupar cantidades requeridas por inventarioid (por si un producto se repite en detalles)
    const requeridos = new Map();
    for (const det of orden.detalleorden || []) {
      const inv = det.inventario;
      if (!inv) {
        return res.status(400).json({
          error: `No se encontró el inventario asociado al detalle ${det.detalleordenid}`,
        });
      }

      const prev = requeridos.get(inv.inventarioid);
      if (prev) {
        prev.cantidadTotal += det.cantidad;
      } else {
        requeridos.set(inv.inventarioid, {
          inventarioid: inv.inventarioid,
          existenciaActual: inv.existencia,
          cantidadTotal: det.cantidad,
          nombreProducto: inv.producto ? inv.producto.nombre : `Inventario #${inv.inventarioid}`,
        });
      }
    }

    // Verificar que haya suficiente existencia para todos los productos
    for (const item of requeridos.values()) {
      if (item.existenciaActual < item.cantidadTotal) {
        return res.status(400).json({
          error: `Existencias insuficientes para "${item.nombreProducto}". Disponible: ${item.existenciaActual}, requerido: ${item.cantidadTotal}`,
        });
      }
    }

    const ahora = new Date().toISOString();
    const alertasStockBajo = [];

    // 1) "Reclamar" la orden: solo cambia si sigue Pendiente.
    //    Evita que dos peticiones simultáneas despachen la misma orden dos veces.
    const { data: ordenActualizada, error: updateOrdenError } = await supabase
      .from('orden')
      .update({
        estado: 'Despachada',
        fechamod: ahora,
      })
      .eq('ordenid', id)
      .eq('estado', 'Pendiente')
      .select()
      .maybeSingle();

    if (updateOrdenError) {
      return res.status(500).json({ error: updateOrdenError.message });
    }

    if (!ordenActualizada) {
      return res.status(409).json({
        error: 'La orden ya fue procesada por otra petición',
      });
    }

    // 2) Descontar existencias. Cada update solo aplica si la existencia no cambió
    //    desde que se leyó (control de concurrencia optimista).
    const aplicados = [];
    const revertir = async () => {
      for (const a of aplicados) {
        await supabase
          .from('inventario')
          .update({ existencia: a.existenciaActual, fechamod: ahora })
          .eq('inventarioid', a.inventarioid);
      }
      await supabase
        .from('orden')
        .update({ estado: 'Pendiente', fechamod: ahora })
        .eq('ordenid', id);
    };

    for (const item of requeridos.values()) {
      const nuevaExistencia = item.existenciaActual - item.cantidadTotal;

      const { data: invActualizado, error: updateInvError } = await supabase
        .from('inventario')
        .update({
          existencia: nuevaExistencia,
          fechamod: ahora,
        })
        .eq('inventarioid', item.inventarioid)
        .eq('existencia', item.existenciaActual)
        .select('inventarioid')
        .maybeSingle();

      if (updateInvError || !invActualizado) {
        await revertir();
        if (updateInvError) {
          return res.status(500).json({ error: updateInvError.message });
        }
        return res.status(409).json({
          error: `La existencia de "${item.nombreProducto}" cambió durante el despacho. Intenta de nuevo.`,
        });
      }

      aplicados.push(item);

      if (nuevaExistencia < 5) {
        alertasStockBajo.push({
          inventarioid: item.inventarioid,
          nombreProducto: item.nombreProducto,
          existenciaActual: nuevaExistencia,
        });
      }
    }

    res.status(200).json({
      message: 'Orden despachada correctamente',
      orden: ordenActualizada,
      alertasStockBajo,
    });
  } catch (err) {
    console.error('Error en PUT /api/ordenes/:id/despachar:', err);
    res.status(500).json({ error: 'Error al despachar la orden' });
  }
});

// PUT /api/ordenes/:id/rechazar - Rechaza una orden sin modificar inventario
router.put('/:id/rechazar', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de orden inválido' });
    }

    const { data: orden, error: findError } = await supabase
      .from('orden')
      .select('ordenid, estado')
      .eq('ordenid', id)
      .eq('activo', true)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({ error: findError.message });
    }

    if (!orden) {
      return res.status(404).json({ error: `No se encontró la orden con ID ${id}` });
    }

    if (orden.estado !== 'Pendiente') {
      return res.status(400).json({
        error: `La orden no se puede rechazar porque su estado actual es "${orden.estado}"`,
      });
    }

    const { data: ordenActualizada, error: updateError } = await supabase
      .from('orden')
      .update({
        estado: 'Rechazada',
        fechamod: new Date().toISOString(),
      })
      .eq('ordenid', id)
      .eq('estado', 'Pendiente')
      .select()
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    if (!ordenActualizada) {
      return res.status(409).json({
        error: 'La orden ya fue procesada por otra petición',
      });
    }

    res.status(200).json({
      message: 'Orden rechazada correctamente',
      orden: ordenActualizada,
    });
  } catch (err) {
    console.error('Error en PUT /api/ordenes/:id/rechazar:', err);
    res.status(500).json({ error: 'Error al rechazar la orden' });
  }
});

module.exports = router;
