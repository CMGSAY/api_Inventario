const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'API de Inventario (.NET MAUI) y Pedidos (React Native)',
    version: '1.0.0',
    description:
      'Documentación interactiva para probar todos los endpoints de Productos, Inventario y Órdenes conectados a Supabase.',
  },
  servers: [
    {
      url: '/',
      description: 'Servidor actual (Local o Render)',
    },
  ],
  tags: [
    {
      name: 'Estado',
      description: 'Verificación de estado de la API',
    },
    {
      name: 'Productos',
      description: 'Gestión de productos (App de Inventario - .NET MAUI)',
    },
    {
      name: 'Inventario',
      description: 'Gestión de existencias y precios (.NET MAUI y React Native)',
    },
    {
      name: 'Órdenes',
      description: 'Creación de pedidos (React Native) y despacho/rechazo (.NET MAUI)',
    },
  ],
  paths: {
    '/': {
      get: {
        tags: ['Estado'],
        summary: 'Verifica que la API esté activa',
        responses: {
          200: {
            description: 'API funcionando correctamente',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  message: 'API de Inventario y Pedidos funcionando',
                  swagger: '/api-docs',
                },
              },
            },
          },
        },
      },
    },
    '/api/productos': {
      get: {
        tags: ['Productos'],
        summary: 'Lista todos los productos activos',
        responses: {
          200: {
            description: 'Lista de productos activos',
            content: {
              'application/json': {
                example: [
                  {
                    productoid: 1,
                    codigo: 'PROD-001',
                    nombre: 'Teclado Mecánico RGB',
                    descripcion: 'Teclado mecánico switches rojos USB',
                    activo: true,
                    fechamod: '2026-11-21T02:00:00.000Z',
                  },
                ],
              },
            },
          },
        },
      },
      post: {
        tags: ['Productos'],
        summary: 'Crea un nuevo producto',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo', 'nombre', 'descripcion'],
                properties: {
                  codigo: { type: 'string', example: 'PROD-001' },
                  nombre: { type: 'string', example: 'Teclado Mecánico RGB' },
                  descripcion: {
                    type: 'string',
                    example: 'Teclado mecánico switches rojos USB',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Producto creado exitosamente',
          },
          400: {
            description: 'Datos obligatorios faltantes',
          },
        },
      },
    },
    '/api/inventario': {
      get: {
        tags: ['Inventario'],
        summary: 'Lista el inventario activo con los datos del producto (JOIN)',
        responses: {
          200: {
            description: 'Lista de inventario con objeto producto anidado',
            content: {
              'application/json': {
                example: [
                  {
                    inventarioid: 1,
                    existencia: 10,
                    precio: 350.5,
                    activo: true,
                    fechamod: '2026-11-21T02:00:00.000Z',
                    productoid: 1,
                    producto: {
                      productoid: 1,
                      codigo: 'PROD-001',
                      nombre: 'Teclado Mecánico RGB',
                      descripcion: 'Teclado mecánico switches rojos USB',
                    },
                  },
                ],
              },
            },
          },
        },
      },
      post: {
        tags: ['Inventario'],
        summary: 'Registra un nuevo detalle de inventario para un producto',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productoid', 'existencia', 'precio'],
                properties: {
                  productoid: { type: 'integer', example: 1 },
                  existencia: { type: 'integer', example: 10 },
                  precio: { type: 'number', example: 350.5 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Detalle de inventario creado',
          },
          400: {
            description: 'Datos inválidos',
          },
          404: {
            description: 'Producto no encontrado',
          },
        },
      },
    },
    '/api/inventario/{id}': {
      put: {
        tags: ['Inventario'],
        summary: 'Actualiza existencia y/o precio de un registro de inventario',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID del inventario (inventarioid)',
            schema: { type: 'integer', example: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  existencia: { type: 'integer', example: 15 },
                  precio: { type: 'number', example: 340.0 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Inventario actualizado correctamente',
          },
          404: {
            description: 'Inventario no encontrado',
          },
        },
      },
    },
    '/api/ordenes': {
      get: {
        tags: ['Órdenes'],
        summary: 'Lista todas las órdenes activas con sus detalles y producto asociado',
        responses: {
          200: {
            description: 'Lista de órdenes ordenadas por fecha descendente',
          },
        },
      },
      post: {
        tags: ['Órdenes'],
        summary: 'Crea una nueva orden (pedido) con múltiples detalles',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cliente', 'detalles'],
                properties: {
                  cliente: { type: 'string', example: 'Carlos Pérez' },
                  numeroorden: {
                    type: 'string',
                    description: 'Opcional. Si no se envía se genera automáticamente (ORD-timestamp)',
                    example: 'ORD-0001',
                  },
                  detalles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['inventarioid', 'cantidad'],
                      properties: {
                        inventarioid: { type: 'integer', example: 1 },
                        cantidad: { type: 'integer', example: 3 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Orden creada con estado Pendiente y totales calculados',
          },
          400: {
            description: 'Datos inválidos',
          },
          404: {
            description: 'Algún inventarioid no existe',
          },
        },
      },
    },
    '/api/ordenes/{id}/despachar': {
      put: {
        tags: ['Órdenes'],
        summary:
          'Despacha una orden pendiente, descuenta existencias y devuelve alertasStockBajo (< 5 unidades)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID de la orden (ordenid)',
            schema: { type: 'integer', example: 1 },
          },
        ],
        responses: {
          200: {
            description: 'Orden despachada y alertas de stock bajo calculadas',
            content: {
              'application/json': {
                example: {
                  message: 'Orden despachada correctamente',
                  orden: {
                    ordenid: 1,
                    numeroorden: 'ORD-0001',
                    cliente: 'Carlos Pérez',
                    total: 1051.5,
                    estado: 'Despachada',
                    activo: true,
                    fechamod: '2026-11-21T02:00:00.000Z',
                  },
                  alertasStockBajo: [
                    {
                      inventarioid: 1,
                      nombreProducto: 'Teclado Mecánico RGB',
                      existenciaActual: 3,
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'La orden no está Pendiente o no hay existencias suficientes',
          },
          404: {
            description: 'Orden no encontrada',
          },
          409: {
            description: 'La orden ya fue procesada por otra petición o el inventario cambió',
          },
        },
      },
    },
    '/api/ordenes/{id}/rechazar': {
      put: {
        tags: ['Órdenes'],
        summary: 'Rechaza una orden pendiente sin modificar el inventario',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID de la orden (ordenid)',
            schema: { type: 'integer', example: 1 },
          },
        ],
        responses: {
          200: {
            description: 'Orden rechazada correctamente',
          },
          400: {
            description: 'La orden no está en estado Pendiente',
          },
          404: {
            description: 'Orden no encontrada',
          },
          409: {
            description: 'La orden ya fue procesada por otra petición o el inventario cambió',
          },
        },
      },
    },
  },
};

const swaggerHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Swagger UI - API Inventario y Pedidos</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    };
  </script>
</body>
</html>`;

module.exports = { swaggerSpec, swaggerHtml };
