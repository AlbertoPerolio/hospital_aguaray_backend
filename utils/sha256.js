import crypto from "crypto";

/**
 * Hash determinístico para DNI / teléfono.
 *
 * Normaliza el valor eliminando todo lo que no sea dígito (puntos, guiones,
 * espacios, "+54", etc.) para que "40.123.456" y "40123456" produzcan el mismo
 * hash. Es la ÚNICA normalización válida para vincular `users.dni_sha256` /
 * `telefono_sha256` con `presential_patient.dni_sha256` / `telefono_sha256`.
 */
export function sha256(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value).replace(/\D/g, "").trim();
  if (!normalized) return null;

  return crypto.createHash("sha256").update(normalized).digest("hex");
}
