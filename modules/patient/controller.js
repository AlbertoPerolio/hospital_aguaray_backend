import bcrypt from "bcrypt";
import PresentialPatient from "../../DB/models/presential_patient.js";
import crypto from "crypto";

function sha256(value) {
  if (value === null || value === undefined) return null;
  return crypto
    .createHash("sha256")
    .update(String(value).trim().toLowerCase())
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

    const fields = {
      first_name: nombre || null,
      last_name: apellido || null,
      nacionalidad: nacionalidad || null,
      createdBy: createdBy || null,
      dni_sha256,
      telefono_sha256,
      // Guardamos el teléfono en texto para poder mostrarlo en UI.
      // Nota: esto no se puede derivar desde hashes.
      telefono: telefono ? String(telefono).trim() : null,
    };

    if (dni) {
      const salt = await bcrypt.genSalt(10);
      fields.dni_hash = await bcrypt.hash(dni.toString(), salt);
    }

    if (telefono) {
      const salt = await bcrypt.genSalt(10);
      fields.telefono_hash = await bcrypt.hash(telefono.toString(), salt);
    }

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
      await existing.update(fields);
      return existing;
    }

    return await PresentialPatient.create(fields);
  }

  return { autocomplete, upsertPatient };
}
