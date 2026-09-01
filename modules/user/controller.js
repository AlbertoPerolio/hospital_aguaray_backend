import UserModel from "../../DB/models/user.js";
import AddressModel from "../../DB/models/address.js";
import { Op } from "sequelize";
import { sha256 } from "../../utils/sha256.js";

export default function userController() {
  // 1. Obtener datos del usuario actual (Mi Perfil)
  async function getProfile(userId) {
    const user = await UserModel.findByPk(userId);

    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const addresses = await AddressModel.findAll({
      where: { id_user: userId },
      order: [["createdAt", "DESC"]],
    });

    return { ...user.toJSON(), addresses };
  }

  // 2. Actualizar datos del perfil propio
  //    (El login es solo con Google: no hay contraseña ni pregunta de seguridad)
  async function updateProfile(userId, data) {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const fieldsToUpdate = {};
    if (data.name) fieldsToUpdate.name = data.name;
    if (data.surname) fieldsToUpdate.surname = data.surname;
    if (data.user) fieldsToUpdate.user = data.user;
    if (data.email) fieldsToUpdate.email = data.email;
    if (data.nacionalidad) fieldsToUpdate.nacionalidad = data.nacionalidad;

    // DNI y teléfono: guardar el valor real en campos visibles,
    // y además guardar el hash solo para búsquedas/verificación.
    if (data.dni) {
      fieldsToUpdate.dni = data.dni.toString().trim();
      fieldsToUpdate.dni_sha256 = sha256(data.dni);
    }

    if (data.telefono) {
      fieldsToUpdate.telefono = data.telefono.toString().trim();
      fieldsToUpdate.telefono_sha256 = sha256(data.telefono);
    }

    if (data.fechaNacimiento) {
      fieldsToUpdate.fechaNacimiento = data.fechaNacimiento;
    }

    if (typeof data.noDomicilioArgentina === "boolean") {
      fieldsToUpdate.noDomicilioArgentina = data.noDomicilioArgentina;
    }

    await user.update(fieldsToUpdate);

    const addresses = await AddressModel.findAll({
      where: { id_user: userId },
      order: [["createdAt", "DESC"]],
    });

    return { ...user.toJSON(), addresses };
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

    // DNI y teléfono (admin): guardar valor real en campos visibles,
    // y además guardar hash para búsquedas/verificación.
    if (data.dni) {
      fieldsToUpdate.dni = data.dni.toString().trim();
      fieldsToUpdate.dni_sha256 = sha256(data.dni);
    }

    if (data.telefono) {
      fieldsToUpdate.telefono = data.telefono.toString().trim();
      fieldsToUpdate.telefono_sha256 = sha256(data.telefono);
    }

    if (typeof data.noDomicilioArgentina === "boolean") {
      fieldsToUpdate.noDomicilioArgentina = data.noDomicilioArgentina;
    }

    await target.update(fieldsToUpdate);

    return target.toJSON();
  }

  // 3. Listar todos los usuarios del sistema con filtros y paginación (Admin/Secretario)
  async function getAllUsers({ search, id_role, page = 1, limit = 10 } = {}) {
    const where = {};

    if (id_role) {
      where.id_role = Number(id_role);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const cleanDigits = search.replace(/\D/g, "");
      const orConditions = [
        { name: { [Op.iLike]: term } },
        { surname: { [Op.iLike]: term } },
        { user: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
      ];

      if (cleanDigits.length > 0) {
        orConditions.push({ dni: { [Op.iLike]: `%${cleanDigits}%` } });
        orConditions.push({ telefono: { [Op.iLike]: `%${cleanDigits}%` } });
        orConditions.push({ dni_sha256: sha256(cleanDigits) });
        orConditions.push({ telefono_sha256: sha256(cleanDigits) });
      }

      where[Op.or] = orConditions;
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const { rows, count } = await UserModel.findAndCountAll({
      where,
      order: [["id_user", "ASC"]],
      limit: parsedLimit,
      offset,
    });

    return {
      users: rows,
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit) || 1,
    };
  }

  // 3.b Buscar usuarios por DNI o Teléfono (Admin/Secretario)
  async function searchUsers({ dni, telefono }) {
    if (!dni && !telefono) return [];

    const where = {};
    if (dni) {
      const dniHash = sha256(dni);
      // Si el DNI no tiene dígitos (ej: "a"), no debe matchear registros con
      // dni_sha256 NULL; devolvemos vacío.
      if (!dniHash) return [];
      where.dni_sha256 = dniHash;
    } else if (telefono) {
      const telefonoHash = sha256(telefono);
      if (!telefonoHash) return [];
      where.telefono_sha256 = telefonoHash;
    }

    return await UserModel.findAll({
      where,
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
