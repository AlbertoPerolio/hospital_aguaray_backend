import bcrypt from "bcrypt";
import PresentialPatient from "../../DB/models/presential_patient.js";
import crypto from "crypto";

function sha256(value) {
  if (value === null || value === undefined) return null;
  return crypto
    .createHash("sha256")
    .update(String(value).replace(/\D/g, "").trim())
    .digest("hex");
}

export default function patientController() {
  // Busca pacientes presenciales por hash determinístico (SHA-256)
  async function autocomplete({ dni, telefono }) {
    if (!dni && !telefono) return [];

    const where = {};
    if (dni) where.dni_sha256 = sha256(dni);
    else if (telefono) where.telefono_sha256 = sha256(telefono);

    return await PresentialPatient.findAll({
      where,
      limit: 5,
    });
  }

  // Crea un nuevo registro o actualiza uno existente si coinciden los hashes
  async function upsertPatient(data, createdBy) {
    const { dni, telefono, nombre, apellido, nacionalidad } = data || {};

    if (!dni && !telefono) {
      const err = new Error(
        "DNI o teléfono son requeridos para paciente presencial",
      );
      err.statusCode = 400;
      throw err;
    }

    const dni_sha256 = sha256(dni);
    const telefono_sha256 = sha256(telefono);

    // Usamos dni_sha256/telefono_sha256 como clave determinística para encontrar/crear.
    // También almacenamos los valores “limpios” (dni/telefono) en texto para mostrarlos en UI.

    const fields = {
      first_name: nombre || null,
      last_name: apellido || null,
      nacionalidad: nacionalidad || null,
      createdBy: createdBy || null,
      dni_sha256,
      telefono_sha256,
      // Guardamos dni/telefono en texto plano (igual que en tabla user)
      // y usamos los hashes SHA-256 para vincular de forma determinística.
      telefono: telefono
        ? String(telefono).toString().replace(/\D/g, "").trim()
        : null,
      dni: dni ? String(dni).toString().replace(/\D/g, "").trim() : null,
    };

    // Ya no guardamos dni_hash/telefono_hash (bcrypt) en presential_patient.
    // Para vincular con la tabla user usamos únicamente dni_sha256/telefono_sha256.

    // Buscamos si ya existe el paciente por sus hashes determinísticos
    let existing = null;
    if (dni) {
      existing = await PresentialPatient.findOne({ where: { dni_sha256 } });
    }
    if (!existing && telefono) {
      existing = await PresentialPatient.findOne({
        where: { telefono_sha256 },
      });
    }

    if (existing) {
      // Si el paciente presencial ya existe por DNI/Teléfono, NO sobrescribimos
      // nombre/apellido/nacionalidad. Esto evita que un "falso" con el mismo DNI
      // reemplace la identidad mostrada en turnos ya existentes.
      const safeFields = {
        createdBy: createdBy || null,
        dni_sha256,
        telefono_sha256,
        telefono: telefono
          ? String(telefono).toString().replace(/\D/g, "").trim()
          : null,
      };

      await existing.update(safeFields);
      return existing;
    }

    return await PresentialPatient.create(fields);
  }

  return { autocomplete, upsertPatient };
}
