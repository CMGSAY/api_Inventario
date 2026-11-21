-- Script de creación de tablas en Supabase (PostgreSQL)
-- Ejecuta este script en el SQL Editor de Supabase si aún no has creado las tablas.

CREATE TABLE IF NOT EXISTS producto (
  productoid SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(300) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventario (
  inventarioid SERIAL PRIMARY KEY,
  existencia INT NOT NULL,
  precio NUMERIC(18, 2) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW(),
  productoid INT REFERENCES producto(productoid)
);

CREATE INDEX IF NOT EXISTS ix_inventario_productoid ON inventario(productoid);

CREATE TABLE IF NOT EXISTS orden (
  ordenid SERIAL PRIMARY KEY,
  numeroorden VARCHAR(20) NOT NULL,
  cliente VARCHAR(100) NOT NULL,
  total NUMERIC(18, 2) NOT NULL,
  estado VARCHAR(25) NOT NULL DEFAULT 'Pendiente',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalleorden (
  detalleordenid SERIAL PRIMARY KEY,
  cantidad INT NOT NULL,
  total NUMERIC(18, 2) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW(),
  inventarioid INT NOT NULL REFERENCES inventario(inventarioid),
  ordenid INT NOT NULL REFERENCES orden(ordenid)
);

CREATE INDEX IF NOT EXISTS ix_detalleorden_ordenid ON detalleorden(ordenid);
CREATE INDEX IF NOT EXISTS ix_detalleorden_inventarioid ON detalleorden(inventarioid);

-- Deshabilitar RLS para permitir operaciones desde la API sin bloqueo de políticas
ALTER TABLE producto DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden DISABLE ROW LEVEL SECURITY;
ALTER TABLE detalleorden DISABLE ROW LEVEL SECURITY;

