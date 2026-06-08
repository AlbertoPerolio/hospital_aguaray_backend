// Diccionario para evitar números sueltos en las rutas
export const ROLES = {
  USER: 1,
  SECRETARY: 2,
  ADMIN: 3,
};

// Middleware para validar el Rol en la ruta
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ error: true, mensaje: "No autenticado." });
      }

      // El Admin (ID: 3) tiene pase libre absoluto para cualquier acción
      if (req.user.id_role === ROLES.ADMIN) {
        return next();
      }

      // Verificamos si el rol del usuario está entre los permitidos para esta ruta
      if (!allowedRoles.includes(req.user.id_role)) {
        return res.status(403).json({
          error: true,
          mensaje: "Acceso denegado. No tenés los privilegios necesarios.",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware extra: Valida que el usuario sea el dueño de lo que quiere modificar
// (Por ejemplo, para que un vendedor no edite el producto de otro vendedor)
export const isOwnerOrAdmin = (resourceKey = "id_user") => {
  return (req, res, next) => {
    // Si es Admin, pasa de largo directamente
    if (req.user.id_role === ROLES.ADMIN) return next();

    // Comparamos el ID del recurso que viene en el body o params con el ID del usuario del token
    const resourceOwnerId =
      req.body[resourceKey] || req.params[resourceKey] || null;

    if (
      resourceOwnerId &&
      parseInt(resourceOwnerId, 10) !== parseInt(req.user.id_user, 10)
    ) {
      return res.status(403).json({
        error: true,
        mensaje: "No tenés permisos para modificar un recurso que no es tuyo.",
      });
    }

    next();
  };
};
