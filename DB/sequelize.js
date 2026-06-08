import sequelize from "./instance.js"; // Importamos la instancia

import user from "./models/user.js";
import address from "./models/address.js";
import role from "./models/role.js";
import permission from "./models/permission.js";

import doctor from "./models/doctor.js";
import doctorDailyCapacity from "./models/doctor_daily_capacity.js";
import turn from "./models/turn.js";
import presentialPatient from "./models/presential_patient.js";

// --- MANDAMOS LAS RELACIONES ACÁ JUNTAS ---
user.hasMany(address, { foreignKey: "id_user", onDelete: "CASCADE" });
address.belongsTo(user, { foreignKey: "id_user" });

role.hasMany(user, { foreignKey: "id_role" });
user.belongsTo(role, { foreignKey: "id_role" });

role.belongsToMany(permission, {
  through: "role_permissions",
  foreignKey: "id_role",
});
permission.belongsToMany(role, {
  through: "role_permissions",
  foreignKey: "id_permission",
});

doctor.hasMany(doctorDailyCapacity, {
  foreignKey: "id_doctor",
  onDelete: "CASCADE",
});
doctorDailyCapacity.belongsTo(doctor, { foreignKey: "id_doctor" });

doctor.hasMany(turn, { foreignKey: "id_doctor", onDelete: "CASCADE" });
turn.belongsTo(doctor, { foreignKey: "id_doctor" });

user.hasMany(turn, { foreignKey: "id_user", onDelete: "CASCADE" });
turn.belongsTo(user, { foreignKey: "id_user" });

presentialPatient.hasMany(turn, {
  foreignKey: "id_patient_record",
  onDelete: "CASCADE",
});
turn.belongsTo(presentialPatient, { foreignKey: "id_patient_record" });

export async function connect() {
  try {
    await sequelize.authenticate();
    console.log(
      "Conexión a PostgreSQL con Sequelize establecida correctamente",
    );

    // Evita fallar si alguna tabla (ej: roles) no existe en la BD.
    // Como tu app depende de sync para recrear, usamos fuerza, pero si
    // MySQL se encuentra en estado inconsistente, esto evita romper el arranque.
    await sequelize.sync({});
    console.log("Tablas sincronizadas");

    // 🚀 --- CARGA DE DATOS INICIALES (SEEDERS) ---
    console.log("Cargando roles y permisos iniciales...");

    // 1. Creamos los Roles obligatorios
    const [userRole] = await sequelize.models.role.findOrCreate({
      where: { id_role: 1 },
      defaults: { name: "usuario" },
    });
    const [secretaryRole] = await sequelize.models.role.findOrCreate({
      where: { id_role: 2 },
      defaults: { name: "secretario" },
    });

    const [adminRole] = await sequelize.models.role.findOrCreate({
      where: { id_role: 3 },
      defaults: { name: "admin" },
    });

    // 2. Creamos los Permisos básicos del sistema
    const [pCreate] = await sequelize.models.permission.findOrCreate({
      where: { name: "product:create" },
      defaults: { description: "Permite registrar turnos nuevos" },
    });

    const [pDelete] = await sequelize.models.permission.findOrCreate({
      where: { name: "product:delete" },
      defaults: { description: "Permite borrar turnos del sistema" },
    });

    const [pEdit] = await sequelize.models.permission.findOrCreate({
      where: { name: "product:edit" },
      defaults: { description: "Permite editar registros del sistema" },
    });

    const [pUsers] = await sequelize.models.permission.findOrCreate({
      where: { name: "user:manage" },
      defaults: { description: "Permite administrar usuarios (solo admin)" },
    });

    // 3. Asignamos los permisos a los roles (Tabla intermedia)
    await secretaryRole.addPermissions([pCreate, pDelete, pEdit]);

    // Al "admin" le damos absolutamente todos los permisos
    await adminRole.addPermissions([pCreate, pDelete, pEdit, pUsers]);

    // El "client" no necesita permisos explícitos en esta tabla porque solo compra

    console.log("¡Roles, permisos y relaciones inicializadas con éxito!");
  } catch (error) {
    console.error("Error al conectar o sincronizar PostgreSQL:", error);
  }
}

export default sequelize;
