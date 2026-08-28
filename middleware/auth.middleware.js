import jwt from "jsonwebtoken";
import config from "../src/config.js";
import UserModel from "../DB/models/user.js";

const secret = config.jwt.secret;

export const verifyJWT = async (req, res, next) => {
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
        mensaje: "Acceso denegado. Se requiere autenticación.",
      });
    }

    // 4. Verificamos y decodificamos el token fresquito
    const decoded = jwt.verify(token, secret);

    // 5. Refrescamos los datos del usuario desde la base de datos.
    //    El token guarda una foto de cuando se inició sesión, así que si
    //    el rol o el perfil cambian (p. ej. admin lo hace secretario),
    //    sin esto seguiríamos viendo el dato viejo hasta el próximo login.
    const currentUser = await UserModel.findByPk(decoded.id_user, {
      attributes: {
        exclude: ["password", "securityAnswer", "securityQuestionId"],
      },
    });

    if (!currentUser) {
      return res.status(401).json({
        error: true,
        mensaje: "Usuario no encontrado o sesión inválida.",
      });
    }

    // 6. Guardamos la info actualizada del usuario en 'req.user' para los siguientes middlewares
    req.user = currentUser.toJSON();

    next(); // Pasaporte sellado, continúa a la ruta o al control de rol
  } catch (err) {
    return res.status(401).json({
      error: true,
      mensaje: "Token inválido o expirado.",
    });
  }
};
