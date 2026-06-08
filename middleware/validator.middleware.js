export const validateSchema = (schema) => (req, res, next) => {
  try {
    // Si el body llega undefined (p.ej. PUT sin payload), Zod exige objeto.
    // Normalizamos para que parsee correctamente.
    req.body = schema.parse(req.body ?? {});
    next();
  } catch (error) {
    const errors = error.errors
      ? error.errors.map((e) => e.message)
      : [error.message || "Datos inválidos"];

    const message = errors.length === 1 ? errors[0] : errors;

    return res.status(400).json({ error: true, body: message });
  }
};
