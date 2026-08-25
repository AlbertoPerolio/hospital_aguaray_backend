import Doctor from "../../DB/models/doctor.js";
import DoctorDailyCapacity from "../../DB/models/doctor_daily_capacity.js";
import { Op } from "sequelize";

export default function doctorController() {
  // CRUD Básico con filtros
  async function listAll(params = {}) {
    // Soportar tanto listAll("2026-08-22") como listAll({ date, search, specialty, activo })
    const { date, search, specialty, activo } =
      typeof params === "string" ? { date: params } : params || {};

    const where = {};

    if (activo !== undefined && activo !== "" && activo !== "ALL") {
      where.activo = activo === true || activo === "true";
    }

    if (specialty && specialty.trim()) {
      where.specialty = { [Op.iLike]: `%${specialty.trim()}%` };
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: term } },
        { surname: { [Op.iLike]: term } },
        { specialty: { [Op.iLike]: term } },
      ];
    }

    const include = [];
    if (date) {
      include.push({
        model: DoctorDailyCapacity,
        where: { date },
        required: false, // LEFT JOIN para traer todos los doctores aunque no tengan capacidad seteada
      });
    }

    return await Doctor.findAll({
      where,
      include,
      order: [
        ["surname", "ASC"],
        ["name", "ASC"],
      ],
    });
  }

  async function createDoctor(data) {
    return await Doctor.create(data);
  }

  async function deleteDoctor(id) {
    const doc = await Doctor.findByPk(id);
    if (!doc) throw new Error("Doctor no encontrado");
    return await doc.destroy();
  }

  async function setActivo(id, status) {
    const doc = await Doctor.findByPk(id);
    if (!doc) throw new Error("Doctor no encontrado");
    return await doc.update({ activo: status });
  }

  // Lógica de las 7 AM: Setear disponibilidad para un día
  async function setDailyCapacitiesForDate({ date, rows }) {
    const results = [];
    for (const row of rows) {
      const [capacity, created] = await DoctorDailyCapacity.findOrCreate({
        where: { id_doctor: row.id_doctor, date },
        defaults: { limit_turns: row.limit_turns, enabled: row.enabled },
      });

      if (!created) {
        await capacity.update({
          limit_turns: row.limit_turns,
          enabled: row.enabled,
        });
      }
      results.push(capacity);
    }
    return results;
  }

  // Obtener doctores disponibles para que el usuario pida turno
  async function listAvailableForDate(date) {
    return await Doctor.findAll({
      include: [
        {
          model: DoctorDailyCapacity,
          where: { date, enabled: true },
          required: true,
        },
      ],
      where: { activo: true },
    });
  }

  return {
    listAll,
    createDoctor,
    deleteDoctor,
    setActivo,
    setDailyCapacitiesForDate,
    listAvailableForDate,
  };
}
