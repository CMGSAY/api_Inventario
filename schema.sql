-- Script de creación de tablas en Supabase (PostgreSQL) dentro del esquema examen_final.
-- Ejecuta este script en el SQL Editor de Supabase.
--
-- IMPORTANTE: además debes exponer el esquema en la API:
--   Project Settings > Data API > "Exposed schemas" > agrega "examen_final" y guarda.

CREATE SCHEMA IF NOT EXISTS examen_final;

CREATE TABLE IF NOT EXISTS examen_final.producto (
  productoid SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(300) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS examen_final.inventario (
  inventarioid SERIAL PRIMARY KEY,
  existencia INT NOT NULL,
  precio NUMERIC(18, 2) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW(),
  productoid INT REFERENCES examen_final.producto(productoid)
);

CREATE INDEX IF NOT EXISTS ix_inventario_productoid ON examen_final.inventario(productoid);

CREATE TABLE IF NOT EXISTS examen_final.orden (
  ordenid SERIAL PRIMARY KEY,
  numeroorden VARCHAR(20) NOT NULL,
  cliente VARCHAR(100) NOT NULL,
  total NUMERIC(18, 2) NOT NULL,
  estado VARCHAR(25) NOT NULL DEFAULT 'Pendiente',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS examen_final.detalleorden (
  detalleordenid SERIAL PRIMARY KEY,
  cantidad INT NOT NULL,
  total NUMERIC(18, 2) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fechamod TIMESTAMP NOT NULL DEFAULT NOW(),
  inventarioid INT NOT NULL REFERENCES examen_final.inventario(inventarioid),
  ordenid INT NOT NULL REFERENCES examen_final.orden(ordenid)
);

CREATE INDEX IF NOT EXISTS ix_detalleorden_ordenid ON examen_final.detalleorden(ordenid);
CREATE INDEX IF NOT EXISTS ix_detalleorden_inventarioid ON examen_final.detalleorden(inventarioid);

-- Permisos para que la API REST (PostgREST) pueda usar el esquema con las keys anon/service_role
GRANT USAGE ON SCHEMA examen_final TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA examen_final TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA examen_final TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA examen_final GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA examen_final GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Deshabilitar RLS para permitir operaciones desde la API sin bloqueo de políticas
ALTER TABLE examen_final.producto DISABLE ROW LEVEL SECURITY;
ALTER TABLE examen_final.inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE examen_final.orden DISABLE ROW LEVEL SECURITY;
ALTER TABLE examen_final.detalleorden DISABLE ROW LEVEL SECURITY;

-- Recargar la caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';
