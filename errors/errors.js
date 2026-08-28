import * as answer from "./answer.js";

function errors(err, req, res, next) {
  console.error("[error] Se capturó un error con next(err):", err);

  // Intentamos obtener el mensaje y el código de estado del objeto Error lanzado
  const status = err.statusCode || err.status || 500; // Asume 500 si no hay status

  // Para errores inesperados (500) no exponemos detalles internos (SQL, stacks,
  // nombres de tablas) al cliente; solo para errores de negocio esperados (4xx).
  const message =
    status >= 400 && status < 500 ? err.message : "Error interno del servidor";

  return answer.error(req, res, message, status);
}

export default errors;
