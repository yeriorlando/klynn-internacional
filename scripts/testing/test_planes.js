import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('planes').upsert({
    id: 'basico',
    nombre: 'Básico Test',
    precio_mensual: 1300,
    precio_anual: 12000,
    limite_empleados: 2,
    limite_ordenes_mes: 300,
    whatsapp: true,
    facturacion_fiscal: true,
    multisucursal: true,
    logistica: false,
    limite_whatsapp_mes: 300
  });
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
