import bcrypt from "bcrypt";
import UserModel from "../../DB/models/user.js"; // Cambiado para evitar conflictos de nombres
import { ROLES } from "../../middleware/role.middleware.js";
import crypto from "crypto";

function sha256(value) {
  if (value === null || value === undefined) return null;
  return crypto
    .createHash("sha256")
    .update(String(value).trim().toLowerCase())
    .digest("hex");
}

export default function registerController() {
  // Función 1: Crear usuario / Registro (add)
  async function add(data) {
    try {
      // Si es el primer usuario del sistema se vuelve ADMIN (ID: 3), sino USER (ID: 1)
      const userCount = await UserModel.count();
      const id_role = userCount === 0 ? ROLES.ADMIN : ROLES.USER;

      const hashedPassword = await bcrypt.hash(data.password.toString(), 10);
      const hashedAnswer = await bcrypt.hash(
        data.securityAnswer.toString().trim().toLowerCase(),
        10,
      );

      const fields = {
        email: data.email,
        user: data.user,
        password: hashedPassword,
        name: data.name || null,
        surname: data.surname || null,
        nacionalidad: data.nacionalidad || null,
        securityQuestionId: data.securityQuestionId,
        securityAnswer: hashedAnswer,
        id_role,
      };

      // Hashear DNI y teléfono si se proporcionan en el registro inicial
      if (data.dni) {
        fields.dni = await bcrypt.hash(data.dni.toString(), 10);
        fields.dni_sha256 = sha256(data.dni);
      }

      if (data.telefono) {
        fields.telefono = await bcrypt.hash(data.telefono.toString(), 10);
        fields.telefono_sha256 = sha256(data.telefono);
      }

      const newUser = await UserModel.create(fields);

      // Excluimos la contraseña antes de retornar el usuario creado
      const userResponse = newUser.toJSON();
      delete userResponse.password;
      delete userResponse.securityAnswer;
      return userResponse;
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        const messages = err.errors.map((e) => {
          if (e.path === "user") return "El nombre de usuario ya existe";
          if (e.path === "email") return "El email ya está registrado";
          return e.message;
        });
        const error = new Error(messages.join(", "));
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  // Función 2: Ver todos los usuarios (all)
  async function all() {
    return await UserModel.findAll({
      attributes: { exclude: ["password"] },
    });
  }

  // Función 3: Ver un solo usuario (one)
  async function one(id_user) {
    const foundUser = await UserModel.findByPk(id_user, {
      attributes: { exclude: ["password"] },
    });

    if (!foundUser) {
      const error = new Error(`Usuario con ID ${id_user} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    return foundUser;
  }

  // Función 4: Actualizar datos completos del usuario (updateUser)
  async function updateUser(id_user, data) {
    const fieldsToUpdate = {};
    const currentUser = await UserModel.findByPk(id_user);

    if (!currentUser) {
      const error = new Error(`Usuario con ID ${id_user} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    // 1. VALIDACIÓN Y CAMBIO DE CONTRASEÑA
    if (data.password) {
      if (!data.currentPassword) {
        const error = new Error(
          "Debe proporcionar la contraseña actual para cambiarla.",
        );
        error.statusCode = 400;
        throw error;
      }

      const isMatch = await bcrypt.compare(
        data.currentPassword.toString(),
        currentUser.password.toString(),
      );

      if (!isMatch) {
        const error = new Error("La contraseña actual es incorrecta.");
        error.statusCode = 401;
        throw error;
      }

      const hashedPassword = await bcrypt.hash(data.password.toString(), 10);
      fieldsToUpdate.password = hashedPassword;
    }

    // 2. VALIDACIÓN Y CAMBIO DE RESPUESTA DE SEGURIDAD
    if (data.securityAnswer) {
      // Exigimos la respuesta anterior para poder cambiarla
      if (!data.currentSecurityAnswer) {
        const error = new Error(
          "Debe proporcionar la respuesta de seguridad actual para cambiarla.",
        );
        error.statusCode = 400;
        throw error;
      }

      // Comparamos la respuesta vieja que tipeó (normalizada) contra el hash de la base de datos
      const isAnswerMatch = await bcrypt.compare(
        data.currentSecurityAnswer.toString().trim().toLowerCase(),
        currentUser.securityAnswer.toString(),
      );

      if (!isAnswerMatch) {
        const error = new Error(
          "La respuesta de seguridad actual es incorrecta.",
        );
        error.statusCode = 401;
        throw error;
      }

      // Si todo coincide, procesamos y encriptamos la nueva respuesta
      const hashedAnswer = await bcrypt.hash(
        data.securityAnswer.toString().trim().toLowerCase(),
        10,
      );
      fieldsToUpdate.securityAnswer = hashedAnswer;
    }

    // 3. Mapeamos el resto de los campos normales
    if (data.name) fieldsToUpdate.name = data.name;
    if (data.surname) fieldsToUpdate.surname = data.surname;
    if (data.email) fieldsToUpdate.email = data.email;
    if (data.user) fieldsToUpdate.user = data.user;
    if (data.securityQuestionId)
      fieldsToUpdate.securityQuestionId = data.securityQuestionId;

    // Agregamos el hasheo de DNI y Teléfono que faltaba en este controlador
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

    if (Object.keys(fieldsToUpdate).length === 0) {
      const error = new Error(
        "No se proporcionaron datos válidos para actualizar.",
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Guardamos los cambios en MySQL
    const [updatedRows] = await UserModel.update(fieldsToUpdate, {
      where: { id_user },
      individualHooks: true,
    });

    if (updatedRows === 0) {
      const error = new Error(
        `Usuario con ID ${id_user} no encontrado para actualizar.`,
      );
      error.statusCode = 404;
      throw error;
    }

    // 5. Buscamos los datos frescos para actualizar el Frontend sin desloguear
    const updatedUser = await UserModel.findByPk(id_user, {
      attributes: { exclude: ["password", "securityAnswer"] },
    });

    return {
      mensaje: "Usuario actualizado con éxito",
      user: updatedUser,
    };
  }
  // Función 5: Actualizar solo el rol (updateRole)
  async function updateRole(id_user, newRoleId) {
    // Validamos que el ID de rol enviado exista en nuestro diccionario de seguridad
    if (!Object.values(ROLES).includes(parseInt(newRoleId, 10))) {
      const error = new Error("Rol inválido.");
      error.statusCode = 400;
      throw error;
    }

    const [updatedRows] = await UserModel.update(
      { id_role: parseInt(newRoleId, 10) },
      { where: { id_user } },
    );

    if (updatedRows === 0) {
      const error = new Error(`Usuario con ID ${id_user} no encontrado.`);
      error.statusCode = 404;
      throw error;
    }

    return {
      id_user,
      id_role: parseInt(newRoleId, 10),
      mensaje: "Rol de usuario actualizado con éxito.",
    };
  }

  // Función 6: Eliminar usuario (del)
  async function del(id_user) {
    const deletedRows = await UserModel.destroy({
      where: { id_user },
    });

    if (deletedRows === 0) {
      const error = new Error(
        `Usuario con ID ${id_user} no encontrado para eliminar.`,
      );
      error.statusCode = 404;
      throw error;
    }

    return true;
  }

  return { add, all, one, updateUser, updateRole, del };
}
