import rateLimit from "express-rate-limit";

// Rate limiting por defecto para proteger endpoints críticos.
// Ajuste sugerido: en producción, usar un store compartido (Redis) si hay múltiples instancias.

export const turnRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 60, // requests por IP en la ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    body: "Demasiadas solicitudes. Probá nuevamente en unos minutos.",
  },
});

export const turnConfirmRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    body: "Demasiadas solicitudes de confirmación. Probá nuevamente en unos minutos.",
  },
});

export const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10, // intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    body: "Demasiados intentos de login. Probá nuevamente en unos minutos.",
  },
});

export const authResetPasswordRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutos
  limit: 5, // intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    body: "Demasiadas solicitudes de reset de contraseña. Probá nuevamente en unos minutos.",
  },
});
