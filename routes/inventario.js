const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/inventario - Lista el inventario activo con datos del producto relacionado
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventario')
      .select(`
        inventarioid,
        existencia,
        precio,
        activo,
        fechamod,
        productoid,
        producto (
          productoid,
          codigo,
          nombre,
          descripcion
        )
      `)
      .eq('activo', true)
      .order('inventarioid', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error en GET /api/inventario:', err);
    res.status(500).json({ error: 'Error al obtener el inventario' });
  }
});

// POST /api/inventario - Registra un nuevo detalle de inventario
router.post('/', async (req, res) => {
  try {
    const { productoid, existencia, precio } = req.body;

    if (
      productoid === undefined ||
      existencia === undefined ||
      precio === undefined
    ) {
      return res.status(400).json({
        error: 'Los campos productoid, existencia y precio son obligatorios',
      });
    }

    const existenciaNum = Number(existencia);
    const precioNum = Number(precio);

    if (!Number.isInteger(existenciaNum) || existenciaNum < 0) {
      return res.status(400).json({
        error: 'existencia debe ser un número entero mayor o igual a 0',
      });
    }

    if (Number.isNaN(precioNum) || precioNum < 0) {
      return res.status(400).json({
        error: 'precio debe ser un número mayor o igual a 0',
      });
    }

    // Verificar que el producto exista y esté activo
    const { data: producto, error: prodError } = await supabase
      .from('producto')
      .select('productoid')
      .eq('productoid', productoid)
      .eq('activo', true)
      .maybeSingle();

    if (prodError) {
      return res.status(500).json({ error: prodError.message });
    }

    if (!producto) {
      return res.status(404).json({
        error: `No se encontró un producto activo con productoid ${productoid}`,
      });
    }

    const nuevoRegistro = {
      productoid: Number(productoid),
      existencia: existenciaNum,
      precio: Number(precioNum.toFixed(2)),
      activo: true,
      fechamod: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('inventario')
      .insert([nuevoRegistro])
      .select(`
        inventarioid,
        existencia,
        precio,
        activo,
        fechamod,
        productoid,
        producto (
          productoid,
          codigo,
          nombre,
          descripcion
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error en POST /api/inventario:', err);
    res.status(500).json({ error: 'Error al registrar el inventario' });
  }
});

// PUT /api/inventario/:id - Actualiza existencia y/o precio y fechamod
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de inventario inválido' });
    }

    const { existencia, precio } = req.body;

    if (existencia === undefined && precio === undefined) {
      return res.status(400).json({
        error: 'Debes enviar al menos existencia o precio para actualizar',
      });
    }

    const camposActualizar = {
      fechamod: new Date().toISOString(),
    };

    if (existencia !== undefined) {
      const existenciaNum = Number(existencia);
      if (!Number.isInteger(existenciaNum) || existenciaNum < 0) {
        return res.status(400).json({
          error: 'existencia debe ser un número entero mayor o igual a 0',
        });
      }
      camposActualizar.existencia = existenciaNum;
    }

    if (precio !== undefined) {
      const precioNum = Number(precio);
      if (Number.isNaN(precioNum) || precioNum < 0) {
        return res.status(400).json({
          error: 'precio debe ser un número mayor o igual a 0',
        });
      }
      camposActualizar.precio = Number(precioNum.toFixed(2));
    }

    const { data, error } = await supabase
      .from('inventario')
      .update(camposActualizar)
      .eq('inventarioid', id)
      .eq('activo', true)
      .select(`
        inventarioid,
        existencia,
        precio,
        activo,
        fechamod,
        productoid,
        producto (
          productoid,
          codigo,
          nombre,
          descripcion
        )
      `)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({
        error: `No se encontró el registro de inventario con ID ${id}`,
      });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error en PUT /api/inventario/:id:', err);
    res.status(500).json({ error: 'Error al actualizar el inventario' });
  }
});

module.exports = router;
