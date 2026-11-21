// Helpers de validación compartidos por las rutas.
// Number(null), Number('') y Number(true) devuelven 0/1, por eso se valida el tipo antes de convertir.

function esNumeroValido(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor);
  if (typeof valor === 'string') return valor.trim() !== '' && Number.isFinite(Number(valor));
  return false;
}

// Devuelve el entero o null si no es un entero válido
function parseEntero(valor) {
  if (!esNumeroValido(valor)) return null;
  const n = Number(valor);
  return Number.isInteger(n) ? n : null;
}

// Devuelve el número o null si no es un número válido
function parseNumero(valor) {
  if (!esNumeroValido(valor)) return null;
  return Number(valor);
}

// Valida un texto obligatorio con longitud máxima. Devuelve mensaje de error o null.
function validarTexto(valor, campo, max) {
  if (valor === undefined || valor === null || !String(valor).trim()) {
    return `El campo ${campo} es obligatorio`;
  }
  if (String(valor).trim().length > max) {
    return `El campo ${campo} no puede superar ${max} caracteres`;
  }
  return null;
}

module.exports = { parseEntero, parseNumero, validarTexto };
