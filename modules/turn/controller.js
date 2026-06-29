import Turn from "../../DB/models/turn.js";
import Doctor from "../../DB/models/doctor.js";
import DoctorDailyCapacity from "../../DB/models/doctor_daily_capacity.js";
import User from "../../DB/models/user.js";
import PresentialPatient from "../../DB/models/presential_patient.js";

export default function turnController() {
  async function countBookedForDoctorOnDate({ id_doctor, date }) {
    // Límite debe respetar TODOS los turnos reservados en el día,
    // incluyendo los que están en PENDIENTE (a confirmar) y CONFIRMADO.
    return await Turn.count({
      where: {
        id_doctor,
        date,
        status: ["PENDIENTE", "CONFIRMADO"],
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

    const bookedCount = await countBookedForDoctorOnDate({
      id_doctor,
      date,
    });

    if (bookedCount >= capacity.limit_turns) {
      const err = new Error(
        "Sin cupos disponibles, por favor intenta de nuevo mas tarde, tal vez se libere un turno",
      );
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

    {
      const hasPatientRecord = !!id_patient_record;

      // Identidad "equivalente":
      // - Si pide con usuario: usamos id_user
      // - Si pide con paciente presencial: derivamos el id_user del usuario existente con el mismo dni_sha256
      // Así evitamos que tras crear la cuenta con el mismo DNI pueda pedir como otro (otro id_user).
      const derivedUserIds = new Set();

      if (id_user) derivedUserIds.add(id_user);

      if (id_patient_record) {
        const presential = await PresentialPatient.findByPk(id_patient_record);

        // Vinculamos por dni_sha256 (NO por dni limpio ni por hash bcrypt)
        if (presential?.dni_sha256) {
          const u = await User.findOne({
            where: { dni_sha256: presential.dni_sha256 },
          });
          if (u?.id_user) derivedUserIds.add(u.id_user);
        }
      }

      const ids = Array.from(derivedUserIds).filter(Boolean);

      // Regla nueva:
      // 1 turno por día por doctor (independiente por doctor).
      // Bloqueamos si existe un turno PENDIENTE/CONFIRMADO para el MISMO
      // doctor + MISMA fecha que pertenezca al mismo paciente.
      // Para equivalencia:
      // - si hay id_user derivado, usamos esos id_user
      // - si hay id_patient_record, usamos ese id_patient_record

      const { Op } = await import("sequelize");

      // Si el request llega ya con id_user (login con cuenta creada),
      // pero el turno previo se guardó con id_patient_record (sin cuenta),
      // entonces necesitamos derivar el id_patient_record desde el dni_sha256
      // del user para poder detectar el conflicto.
      let derivedPatientRecordIds = [];
      if (ids.length) {
        const u = await User.findOne({
          where: { id_user: ids[0] },
          attributes: ["id_user", "dni_sha256"],
        });

        if (u?.dni_sha256) {
          const ps = await PresentialPatient.findAll({
            where: { dni_sha256: u.dni_sha256 },
            attributes: ["id_patient_record"],
          });

          derivedPatientRecordIds = ps
            .map((p) => p.id_patient_record)
            .filter(Boolean);
        }
      }

      const patientRecordIdsForConflict = Array.from(
        new Set([
          ...(hasPatientRecord ? [id_patient_record] : []),
          ...derivedPatientRecordIds,
        ]),
      );

      const conflict = await Turn.findOne({
        where: {
          status: ["PENDIENTE", "CONFIRMADO"],
          date,
          id_doctor,
          [Op.or]: [
            ...(ids.length ? [{ id_user: ids[0] }] : []),
            ...(patientRecordIdsForConflict.length
              ? [{ id_patient_record: patientRecordIdsForConflict[0] }]
              : []),
          ],
        },
      });

      // Nota: la lógica de arriba usa ambos campos si existen; si el sistema
      // guarda turnos pre-cuenta con id_user=NULL, entonces el conflicto no
      // se va a encontrar por id_user y se va a encontrar por id_patient_record
      // (cuando hasPatientRecord es true).

      if (conflict) {
        const err = new Error(
          "Ya tenés un turno pendiente o confirmado para ese doctor y esa fecha. No podés solicitar otro.",
        );
        err.statusCode = 400;
        throw err;
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
    // Mostrar turnos del usuario, incluyendo los que se hayan creado como
    // paciente presencial (id_patient_record) antes de que el usuario existiera.

    const numericIdUser = Number(id_user);

    // 1) Obtenemos el dni_sha256 del usuario autenticado
    const u = await User.findOne({
      where: { id_user: numericIdUser },
      attributes: ["id_user", "dni_sha256"],
    });

    if (!u?.dni_sha256) {
      // Fallback: si no hay dni_sha256, mostramos como siempre por id_user
      return await Turn.findAll({
        where: { id_user: numericIdUser },
        include: [{ model: Doctor }],
        order: [["createdAt", "DESC"]],
      });
    }

    // 2) Buscamos todos los pacientes presenciales asociados por dni_sha256
    const patientRecords = await PresentialPatient.findAll({
      where: { dni_sha256: u.dni_sha256 },
      attributes: ["id_patient_record"],
    });

    const patientIds = patientRecords
      .map((p) => p.id_patient_record)
      .filter(Boolean);

    // 3) Unimos ambos criterios: por id_user o por id_patient_record
    const { Op } = await import("sequelize");

    return await Turn.findAll({
      where: {
        [Op.or]: [
          { id_user: numericIdUser },
          ...(patientIds.length ? [{ id_patient_record: patientIds[0] }] : []),
        ],
      },
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
          // Agregamos nacionalidad para que el front pueda mostrarla
          // cuando el turno fue pedido por usuario logueado.
          attributes: ["id_user", "name", "surname", "user", "nacionalidad"],
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

    const bookedCount = await countBookedForDoctorOnDate({
      id_doctor: t.id_doctor,
      date: t.date,
    });

    // bookedCount ya incluye este turno porque está PENDIENTE.
    // Al confirmar no debería superar el límite; si está al tope, falla.
    if (bookedCount > capacity.limit_turns - 1) {
      const err = new Error("Ya no hay cupos disponibles");
      err.statusCode = 400;
      throw err;
    }

    t.status = "CONFIRMADO";
    // confirmación: usamos updatedAt (timestamps) para la fecha,
    // y guardamos quién lo hizo en modifiedBy.
    t.modifiedBy = confirmedBy;
    await t.save();

    return t;
  }

  async function cancelTurn(id_turn, modifiedBy) {
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
    // cancelación: guardamos quién lo hizo en modifiedBy;
    // la fecha se obtiene de updatedAt.
    t.modifiedBy = modifiedBy;
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
