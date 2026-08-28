import jwt from "jsonwebtoken";
import config from "../../../src/config.js";

const secret = config.jwt.secret;

// Firmamos SOLO los claims mínimos (sin datos personales en el payload) y con
// expiración para que las sesiones no vivan indefinidamente.
export function assignToken(user) {
  return jwt.sign({ id_user: user.id_user, id_role: user.id_role }, secret, {
    expiresIn: "24h",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, secret);
}
