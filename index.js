require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productosRoutes = require('./routes/productos');
const inventarioRoutes = require('./routes/inventario');
const ordenesRoutes = require('./routes/ordenes');
const { swaggerSpec, swaggerHtml } = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint raíz de verificación
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API de Inventario y Pedidos funcionando',
    swagger: '/api-docs',
  });
});

// Documentación interactiva Swagger UI (/api-docs y /swagger)
app.get('/swagger.json', (req, res) => {
  res.status(200).json(swaggerSpec);
});

app.get(['/api-docs', '/swagger'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(swaggerHtml);
});

// Rutas de la API
app.use('/api/productos', productosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ordenes', ordenesRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Manejo de errores generales (incluye JSON mal formado)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'JSON inválido en el cuerpo de la petición' });
  }
  console.error('Error inesperado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});
