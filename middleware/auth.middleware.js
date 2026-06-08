import jwt from "jsonwebtoken";
import config from "../src/config.js";

const secret = config.jwt.secret;

export const verifyJWT = (req, res, next) => {
  try {
    let token = null;

    // 1. Buscamos el token en las cabeceras (App Móvil / Postman)
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    // 2. Si no está en el Header, lo buscamos en las cookies (Web / React)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    // 3. Si no hay token en ningún lado, bloqueamos el paso
    if (!token) {
      return res.status(401).json({
        error: true,
        mensaje:
          "Acceso denegado. ¿Que haces viendo aquí bro? ¿Te gano la curiosidad?.",
      });
    }

    // 4. Verificamos y decodificamos el token fresquito
    const decoded = jwt.verify(token, secret);

    // 5. Guardamos la info del usuario en 'req.user' para los siguientes middlewares
    req.user = decoded;

    next(); // Pasaporte sellado, continúa a la ruta o al control de rol
  } catch (err) {
    return res.status(401).json({
      error: true,
      mensaje: "Token inválido o expirado.",
    });
  }
};
