import PresentialPatient from "../../DB/models/presential_patient.js";
import { sha256 } from "../../utils/sha256.js";

export default function patientController() {
  // Busca pacientes presenciales por hash determinístico (SHA-256)
  async function autocomplete({ dni, telefono }) {
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

    return await PresentialPatient.findAll({
      where,
      limit: 5,
    });
  }

  // Crea un nuevo registro o actualiza uno existente si coinciden los hashes
  async function upsertPatient(data, createdBy) {
    const { nombre, apellido, nacionalidad } = data || {};

    // Normalizamos a solo dígitos ANTES de hashear para que el dni/telefono
    // visible y sus hashes nunca diverjan (ej: "a" queda vacío y se rechaza).
    const dni =
      data?.dni != null ? String(data.dni).replace(/\D/g, "").trim() : "";
    const telefono =
      data?.telefono != null
        ? String(data.telefono).replace(/\D/g, "").trim()
        : "";

    if (!dni && !telefono) {
      const err = new Error(
        "DNI o teléfono son requeridos para paciente presencial",
      );
      err.statusCode = 400;
      throw err;
    }

    const dni_sha256 = dni ? sha256(dni) : null;
    const telefono_sha256 = telefono ? sha256(telefono) : null;

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
      telefono: telefono || null,
      dni: dni || null,
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
        telefono: telefono || null,
        // Mantener el dni visible sincronizado con dni_sha256: antes solo se
        // actualizaba el hash y el dni quedaba "viejo", generando que la
        // búsqueda pidiera un DNI distinto al que muestra el turno.
        dni: dni || null,
      };

      await existing.update(safeFields);
      return existing;
    }

    return await PresentialPatient.create(fields);
  }

  return { autocomplete, upsertPatient };
}
