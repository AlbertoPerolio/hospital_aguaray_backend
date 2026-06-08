export function success(req, res, data = {}, status = 200) {
  const responseData = data === null || data === undefined ? {} : data;
  res.status(status).send({
    error: false,
    status: status,
    body: responseData,
  });
}

export function error(req, res, mensaje = "Inside Error", status = 500) {
  res.status(status).send({
    error: true,
    status: status,
    message: mensaje,
  });
}
