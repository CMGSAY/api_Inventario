const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
// Las tablas viven en el esquema "examen_final" (no en "public")
const supabaseSchema = process.env.SUPABASE_SCHEMA || 'examen_final';

if (!supabaseUrl || !supabaseKey) {
  // createClient('') lanza "supabaseUrl is required" y tumba el servidor con un mensaje confuso
  console.error(
    'Faltan variables de entorno SUPABASE_URL y/o SUPABASE_KEY. Copia .env.example a .env y complétalo.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: supabaseSchema },
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
