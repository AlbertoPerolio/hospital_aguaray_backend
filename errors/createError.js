function createError(message, statusCode) {
  const error = new Error(message);

  // Guardamos el statusCode (tu middleware ya busca 'err.statusCode' o 'err.status')
  error.statusCode = statusCode || 500;

  return error;
}

export default createError;
