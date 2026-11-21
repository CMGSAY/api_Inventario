const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/productos - Lista todos los productos activos
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('producto')
      .select('productoid, codigo, nombre, descripcion, activo, fechamod')
      .eq('activo', true)
      .order('productoid', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error en GET /api/productos:', err);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
});

// POST /api/productos - Crea un nuevo producto
router.post('/', async (req, res) => {
  try {
    const { codigo, nombre, descripcion } = req.body;

    if (!codigo || !nombre || !descripcion) {
      return res.status(400).json({
        error: 'Los campos codigo, nombre y descripcion son obligatorios',
      });
    }

    const nuevoProducto = {
      codigo: String(codigo).trim(),
      nombre: String(nombre).trim(),
      descripcion: String(descripcion).trim(),
      activo: true,
      fechamod: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('producto')
      .insert([nuevoProducto])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error en POST /api/productos:', err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

module.exports = router;
