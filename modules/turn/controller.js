import Turn from "../../DB/models/turn.js";
import Doctor from "../../DB/models/doctor.js";
import DoctorDailyCapacity from "../../DB/models/doctor_daily_capacity.js";
import User from "../../DB/models/user.js";
import PresentialPatient from "../../DB/models/presential_patient.js";

export default function turnController() {
  async function countConfirmedForDoctorOnDate({ id_doctor, date }) {
    return await Turn.count({
      where: {
        id_doctor,
        date,
        status: "CONFIRMADO",
      },
    });
  }

  async function getCapacityRow({ id_doctor, date }) {
    return await DoctorDailyCapacity.findOne({ where: { id_doctor, date } });
  }

  // Usuario pide turno
  async function requestTurn({ id_doctor, date, id_user, id_patient_record }) {
    const doctor = await Doctor.findByPk(id_doctor);
    if (!doctor) {
      const err = new Error("Doctor no encontrado");
      err.statusCode = 404;
      throw err;
    }

    if (!doctor.activo) {
      const err = new Error("Doctor pausado");
      err.statusCode = 400;
      throw err;
    }

    const capacity = await getCapacityRow({ id_doctor, date });
    if (!capacity || !capacity.enabled) {
      const err = new Error("Doctor no disponible para esa fecha");
      err.statusCode = 400;
      throw err;
    }

    const confirmedCount = await countConfirmedForDoctorOnDate({
      id_doctor,
      date,
    });

    if (confirmedCount >= capacity.limit_turns) {
      const err = new Error("Sin cupos disponibles para esa fecha");
      err.statusCode = 400;
      throw err;
    }

    if (!id_user && !id_patient_record) {
      const err = new Error(
        "Se requiere un usuario o un registro de paciente para el turno",
      );
      err.statusCode = 400;
      throw err;
    }

    // Regla paciente: solo 1 turno activo (PENDIENTE o CONFIRMADO)
    // - Si es usuario registrado: controlamos por id_user
    // - Si es paciente presencial: controlamos por dni_sha256 (contra user) y también por id_patient_record
    {
      let blockedUserId = null;
      if (id_patient_record && !id_user) {
        const presential = await PresentialPatient.findByPk(id_patient_record);
        if (presential?.dni_sha256) {
          const u = await User.findOne({
            where: { dni_sha256: presential.dni_sha256 },
          });
          blockedUserId = u ? u.id_user : null;
        }
      }

      // Armamos consulta OR: mismo id_user (cuenta) o mismo id_patient_record (presencial)
      // y si existe usuario por dni_sha256 del presencial, también bloqueamos por ese id_user.
      const whereOr = [];
      if (id_user) whereOr.push({ id_user });
      if (id_patient_record) whereOr.push({ id_patient_record });
      if (blockedUserId) whereOr.push({ id_user: blockedUserId });

      if (whereOr.length > 0) {
        // Evitamos usar Op.or porque en este proyecto Turn.sequelize.Op puede venir undefined.
        // En su lugar, hacemos 2 consultas separadas (OR manual):
        // - si ya hay turno activo por id_user
        // - o si ya hay turno activo por id_patient_record
        // - o por id_user "derivado" del dni_sha256 del paciente presencial

        const existingByIdUser = whereOr.some((c) => c.id_user)
          ? await Turn.findOne({
              where: {
                status: ["PENDIENTE", "CONFIRMADO"],
                date,
                id_user: whereOr.find((c) => c.id_user).id_user,
              },
            })
          : null;

        const existingByPatientRecord = whereOr.some((c) => c.id_patient_record)
          ? await Turn.findOne({
              where: {
                status: ["PENDIENTE", "CONFIRMADO"],
                date,
                id_patient_record: whereOr.find((c) => c.id_patient_record)
                  .id_patient_record,
              },
            })
          : null;

        if (existingByIdUser || existingByPatientRecord) {
          const err = new Error(
            "Ya tenés un turno pendiente o confirmado para esa fecha. No podés solicitar otro.",
          );
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // Creamos el turno como PENDIENTE (a confirmar por secretario)
    return await Turn.create({
      id_doctor,
      id_user: id_user || null,
      id_patient_record: id_patient_record || null,
      date,
      status: "PENDIENTE",
    });
  }

  async function myTurns(id_user) {
    return await Turn.findAll({
      where: { id_user },
      include: [{ model: Doctor }],
      order: [["createdAt", "DESC"]],
    });
  }

  async function pendingTurns() {
    return await Turn.findAll({
      where: { status: "PENDIENTE" },
      include: [
        { model: Doctor },
        {
          model: User,
          attributes: ["id_user", "name", "surname", "user"],
        },
        { model: PresentialPatient },
      ],
      order: [["createdAt", "ASC"]],
    });
  }

  async function allTurnsWithFilter({ status }) {
    const where = {};
    if (status && status !== "ALL") where.status = status;

    return await Turn.findAll({
      where,
      include: [
        { model: Doctor },
        {
          model: User,
          attributes: ["id_user", "name", "surname", "user"],
        },
        { model: PresentialPatient },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  async function confirmTurn(id_turn, confirmedBy) {
    const t = await Turn.findByPk(id_turn);
    if (!t) {
      const err = new Error("Turno no encontrado");
      err.statusCode = 404;
      throw err;
    }
    if (t.status !== "PENDIENTE") {
      const err = new Error("Solo se puede confirmar un turno pendiente");
      err.statusCode = 400;
      throw err;
    }

    const capacity = await getCapacityRow({
      id_doctor: t.id_doctor,
      date: t.date,
    });
    if (!capacity || !capacity.enabled) {
      const err = new Error("Capacidad no disponible");
      err.statusCode = 400;
      throw err;
    }

    const confirmedCount = await countConfirmedForDoctorOnDate({
      id_doctor: t.id_doctor,
      date: t.date,
    });

    // confirmedCount ya cuenta el turno confirmado actual; como el turno es PENDIENTE aún, no cuenta.
    if (confirmedCount >= capacity.limit_turns) {
      const err = new Error("Ya no hay cupos disponibles");
      err.statusCode = 400;
      throw err;
    }

    t.status = "CONFIRMADO";
    t.confirmedAt = new Date();
    t.confirmedBy = confirmedBy;
    await t.save();

    return t;
  }

  async function cancelTurn(id_turn) {
    const t = await Turn.findByPk(id_turn);
    if (!t) {
      const err = new Error("Turno no encontrado");
      err.statusCode = 404;
      throw err;
    }
    if (t.status !== "PENDIENTE") {
      const err = new Error("Solo se puede cancelar un turno pendiente");
      err.statusCode = 400;
      throw err;
    }

    t.status = "CANCELADO";
    await t.save();
    return t;
  }

  return {
    requestTurn,
    myTurns,
    pendingTurns,
    allTurnsWithFilter,
    confirmTurn,
    cancelTurn,
  };
}
