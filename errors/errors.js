import * as answer from "./answer.js";

function errors(err, req, res, next) {
  console.error("[error] Se capturó un error con next(err):", err);

  // Intentamos obtener el mensaje y el código de estado del objeto Error lanzado
  const message =
    err.message || "Error interno del servidor (Mensaje no definido)";
  const status = err.statusCode || err.status || 500; // Asume 500 si no hay status

  return answer.error(req, res, message, status);
}

export default errors;
