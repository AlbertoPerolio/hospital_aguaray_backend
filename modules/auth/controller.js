import bcrypt from "bcrypt";
import UserModel from "../../DB/models/user.js";
import { assignToken } from "./authlog/index.js";

export default function authController() {
  async function login(identifier, password) {
    // Buscamos por nombre de usuario
    let foundUser = await UserModel.findOne({ where: { user: identifier } });

    // Si no está, buscamos por email
    if (!foundUser) {
      foundUser = await UserModel.findOne({ where: { email: identifier } });
    }

    if (!foundUser) {
      const error = new Error("El usuario no existe");
      error.statusCode = 404;
      throw error;
    }

    const isValid = await bcrypt.compare(password, foundUser.password);
    if (!isValid) {
      const error = new Error("Datos incorrectos");
      error.statusCode = 401;
      throw error;
    }

    // Retornamos el token firmado con la info limpia del usuario
    return assignToken(foundUser.toJSON());
  }
  // Función 7: Resetear contraseña olvidada mediante pregunta de seguridad
  async function resetPassword(data) {
    // Buscamos al usuario por su username o por su email
    let userFound = await UserModel.findOne({ where: { user: data.user } });
    if (!userFound) {
      userFound = await UserModel.findOne({ where: { email: data.user } });
    }

    if (!userFound) {
      const error = new Error("El usuario o email no existe.");
      error.statusCode = 404;
      throw error;
    }

    // ✅ Si el usuario fue creado con Google (o no tiene contraseña local),
    // no tiene sentido intentar resetear con respuesta de seguridad.
    // Dependemos de que en Plan A dejemos password/security* en null.
    if (!userFound.password || !userFound.securityAnswer) {
      const error = new Error(
        "Esta cuenta usa Google. Iniciá sesión con Google.",
      );
      error.statusCode = 409;
      throw error;
    }

    // Normalizamos la respuesta del front (Zod ya lo hace, pero nos aseguramos)
    const normalizedAnswer = data.securityAnswer
      .toString()
      .trim()
      .toLowerCase();

    // Comparamos usando bcrypt contra el hash guardado en MySQL
    const isAnswerCorrect = await bcrypt.compare(
      normalizedAnswer,
      userFound.securityAnswer.toString(),
    );

    if (!isAnswerCorrect) {
      const error = new Error("La respuesta de seguridad es incorrecta.");
      error.statusCode = 401;
      throw error;
    }

    // Si todo está OK, hasheamos la nueva contraseña de forma segura
    const hashedNewPassword = await bcrypt.hash(
      data.newPassword.toString(),
      10,
    );

    // Actualizamos la contraseña en la base de datos
    await UserModel.update(
      { password: hashedNewPassword },
      { where: { id_user: userFound.id_user } },
    );

    return {
      mensaje: "Contraseña restablecida con éxito. Ya podés iniciar sesión.",
    };
  }

  return { login, resetPassword };
}
