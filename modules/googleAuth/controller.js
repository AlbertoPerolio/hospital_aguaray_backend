import { OAuth2Client } from "google-auth-library";
import config from "../../src/config.js";
import UserModel from "../../DB/models/user.js";
import { assignToken } from "../auth/authlog/index.js";

export default function googleAuthController() {
  async function googleLoginOrSignup({ credential }) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
    if (!googleClientId) {
      const error = new Error(
        "Falta configurar GOOGLE_CLIENT_ID en el backend (.env)",
      );
      error.statusCode = 500;
      throw error;
    }

    const client = new OAuth2Client(googleClientId);

    // Verifica firma y audiencia del token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      const error = new Error("Google no devolvió datos válidos (payload).");
      error.statusCode = 401;
      throw error;
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    // 1) Separar nombre y apellido (Google muchas veces manda "Nombre Apellido" en `name`)
    const fullName = (name || "").toString().trim();
    const parts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
    const parsedName = parts[0] || null;
    const parsedSurname = parts.length > 1 ? parts.slice(1).join(" ") : null;

    // 2) Buscar por googleId
    let user = await UserModel.findOne({ where: { googleId } });

    // 2) Fallback por email (por si ya existía un usuario local con ese email)
    if (!user && email) {
      user = await UserModel.findOne({ where: { email } });
    }

    // 3) Crear si no existe
    if (!user) {
      // generar username único usando parte del email o nombre
      const base = (name || "user")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      const emailLocal = email ? email.toLowerCase().split("@")[0] : "user";
      const usernameBase = base !== "user" ? base : emailLocal;

      // intentar resolver colisión de username
      let username = usernameBase;
      let i = 0;
      while (await UserModel.findOne({ where: { user: username } })) {
        i += 1;
        username = `${usernameBase}${i}`;
      }

      // Si es el primer usuario del sistema, lo marcamos como ADMIN
      const userCount = await UserModel.count();
      const id_role = userCount === 0 ? 3 : 1; // ADMIN=3, CLIENT=1

      const created = await UserModel.create({
        googleId,
        email: email || null,
        user: username,
        name: parsedName || null,
        surname: parsedSurname || null,

        password: null,
        securityQuestionId: null,
        securityAnswer: null,
        id_role,
      });

      user = created;
    } else {
      // Si existe por email pero no tiene googleId asignado, actualizar
      if (!user.googleId) {
        await UserModel.update(
          { googleId },
          { where: { id_user: user.id_user } },
        );
        user = await UserModel.findByPk(user.id_user);
      }
    }

    return assignToken(user.toJSON());
  }

  return { googleLoginOrSignup };
}
