import AddressModel from "../../DB/models/address.js";

export default function addressController() {
  // 1. Crear/Actualizar Dirección (1 por usuario)
  async function add(data, userId) {
    const existing = await AddressModel.findOne({ where: { id_user: userId } });

    const payload = {
      id_user: userId,
      street: data.street,
      number: data.number,
      floor: data.floor || null,
      apartment: data.apartment || null,
      postalCode: data.postalCode,
      city: data.city,
      province: data.province,
      description: data.description || null,
    };

    if (existing) {
      await existing.update(payload);
      return existing;
    }

    return await AddressModel.create(payload);
  }

  // 2. Listar direcciones del usuario logueado
  async function myAddresses(userId) {
    return await AddressModel.findAll({
      where: { id_user: userId },
      order: [["createdAt", "DESC"]],
    });
  }

  // 3. Actualizar Dirección
  async function update(id_address, data, currentUser) {
    const address = await AddressModel.findByPk(id_address);

    if (!address) {
      const error = new Error("Dirección no encontrada");
      error.statusCode = 404;
      throw error;
    }

    // 🔐 SEGURIDAD: Solo el dueño de la dirección o Staff (Admin/Secretario) puede editarla
    const isStaff = currentUser.id_role === 2 || currentUser.id_role === 3;
    if (!isStaff && address.id_user !== currentUser.id_user) {
      const error = new Error(
        "No tenés permisos para modificar esta dirección.",
      );
      error.statusCode = 403;
      throw error;
    }

    // Si setea esta como predeterminada, apagamos las demás

    await address.update(data);
    return address;
  }

  // 4. Eliminar Dirección
  async function del(id_address, currentUser) {
    const address = await AddressModel.findByPk(id_address);

    if (!address) {
      const error = new Error("Dirección no encontrada");
      error.statusCode = 404;
      throw error;
    }

    // 🔐 SEGURIDAD: Solo el dueño o Staff (Admin/Secretario) elimina
    const isStaff = currentUser.id_role === 2 || currentUser.id_role === 3;
    if (!isStaff && address.id_user !== currentUser.id_user) {
      const error = new Error(
        "No tenés permisos para eliminar esta dirección.",
      );
      error.statusCode = 403;
      throw error;
    }

    await address.destroy();
    return { mensaje: "Dirección eliminada con éxito" };
  }

  return { add, myAddresses, update, del };
}
