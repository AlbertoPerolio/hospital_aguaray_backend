import UserModel from "../../DB/models/user.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

function sha256(value) {
  if (value === null || value === undefined) return null;
  return crypto
    .createHash("sha256")
    .update(String(value).trim().toLowerCase())
    .digest("hex");
}

export default function userController() {
  // 1. Obtener datos del usuario actual (Mi Perfil)
  async function getProfile(userId) {
    const user = await UserModel.findByPk(userId, {
      attributes: {
        exclude: ["password", "securityAnswer", "securityQuestionId"],
      },
    });

    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  // 2. Actualizar datos del perfil propio
  async function updateProfile(userId, data) {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    // 🔐 Si quiere cambiar contraseña, verificar actual
    if (data.password) {
      const isPasswordValid = await bcrypt.compare(
        data.currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        const error = new Error(
          "La contraseña actual ingresada es incorrecta.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // 🔐 Si quiere cambiar seguridad, verificar respuesta actual
    if (data.securityAnswer) {
      if (!data.currentSecurityAnswer) {
        const error = new Error(
          "Si cambia la respuesta de seguridad, debe ingresar la respuesta actual.",
        );
        error.statusCode = 400;
        throw error;
      }

      const normalizedCurrentAnswer = data.currentSecurityAnswer
        .toString()
        .toLowerCase()
        .trim();

      const isAnswerMatch = await bcrypt.compare(
        normalizedCurrentAnswer,
        user.securityAnswer,
      );

      if (!isAnswerMatch) {
        const error = new Error(
          "La respuesta de seguridad actual es incorrecta.",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const fieldsToUpdate = {};
    if (data.name) fieldsToUpdate.name = data.name;
    if (data.surname) fieldsToUpdate.surname = data.surname;
    if (data.user) fieldsToUpdate.user = data.user;
    if (data.email) fieldsToUpdate.email = data.email;
    if (data.securityQuestionId)
      fieldsToUpdate.securityQuestionId = data.securityQuestionId;

    if (data.securityAnswer) {
      const salt = await bcrypt.genSalt(10);
      fieldsToUpdate.securityAnswer = await bcrypt.hash(
        data.securityAnswer.toLowerCase().trim(),
        salt,
      );
    }

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      fieldsToUpdate.password = await bcrypt.hash(data.password, salt);
    }

    // Hashear DNI y teléfono si el usuario los envía desde su perfil.
    if (data.dni) {
      const salt = await bcrypt.genSalt(10);
      fieldsToUpdate.dni = await bcrypt.hash(data.dni.toString(), salt);
      fieldsToUpdate.dni_sha256 = sha256(data.dni);
    }

    if (data.telefono) {
      const salt = await bcrypt.genSalt(10);
      fieldsToUpdate.telefono = await bcrypt.hash(
        data.telefono.toString(),
        salt,
      );
      fieldsToUpdate.telefono_sha256 = sha256(data.telefono);
    }

    await user.update(fieldsToUpdate);

    const updatedUser = user.toJSON();

    delete updatedUser.password;
    delete updatedUser.securityAnswer;
    return updatedUser;
  }

  // 2.5 Actualizar datos de usuario ajeno (Admin/Secretario)
  async function updateUserByAdmin({ id_user, data }) {
    const target = await UserModel.findByPk(id_user);
    if (!target) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const fieldsToUpdate = {};

    if (data.name) fieldsToUpdate.name = data.name;
    if (data.surname) fieldsToUpdate.surname = data.surname;
    if (data.nacionalidad) fieldsToUpdate.nacionalidad = data.nacionalidad;

    if (data.dni) {
      const salt = await bcrypt.genSalt(10);
      fieldsToUpdate.dni = await bcrypt.hash(data.dni.toString(), salt);
      fieldsToUpdate.dni_sha256 = sha256(data.dni);
    }

    if (data.telefono) {
      const salt = await bcrypt.genSalt(10);
      fieldsToUpdate.telefono = await bcrypt.hash(
        data.telefono.toString(),
        salt,
      );
      fieldsToUpdate.telefono_sha256 = sha256(data.telefono);
    }

    await target.update(fieldsToUpdate);

    const updatedUser = target.toJSON();
    delete updatedUser.password;
    delete updatedUser.securityAnswer;
    return updatedUser;
  }

  // 3. Listar todos los usuarios del sistema (Admin/Secretario)
  async function getAllUsers() {
    return await UserModel.findAll({
      attributes: {
        exclude: ["password", "securityAnswer", "securityQuestionId"],
      },
      order: [["id_user", "ASC"]],
    });
  }

  // 3.b Buscar usuarios por DNI o Teléfono (Admin/Secretario)
  async function searchUsers({ dni, telefono }) {
    if (!dni && !telefono) return [];

    const where = {};
    if (dni) where.dni_sha256 = sha256(dni);
    else if (telefono) where.telefono_sha256 = sha256(telefono);

    return await UserModel.findAll({
      where,
      attributes: {
        exclude: ["password", "securityAnswer", "securityQuestionId"],
      },
      limit: 5,
    });
  }

  // 4. Cambiar el rol de un usuario (Solo Admin)
  async function changeRole(id_user, id_role) {
    const user = await UserModel.findByPk(id_user);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    await user.update({ id_role });

    return {
      mensaje: `Rol del usuario '${user.user}' actualizado con éxito a Rol ${id_role}`,
    };
  }

  return {
    getProfile,
    updateProfile,
    updateUserByAdmin,
    getAllUsers,
    searchUsers,
    changeRole,
  };
}
