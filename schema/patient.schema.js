import { z } from "zod";

// DNI/teléfono: permiten vacío (el controller decide si es "no informado"),
// pero si vienen con valor deben ser solo números y respetar la longitud.
// `min` en 0 significa "sin mínimo" (solo dígitos y tope de longitud).
const digitsOrEmpty = (min, max, label) =>
  z
    .string()
    .refine(
      (v) => v === "" || new RegExp(`^\\d{${min},${max}}$`).test(v),
      {
        message:
          min > 0
            ? `${label} debe contener solo números y tener entre ${min} y ${max} dígitos`
            : `${label} debe contener solo números y no superar los ${max} dígitos`,
      },
    )
    .optional()
    .nullable();

export const upsertPatientSchema = z
  .object({
    dni: digitsOrEmpty(7, 8, "El DNI"),
    telefono: digitsOrEmpty(0, 15, "El teléfono"),
    nombre: z
      .string()
      .max(50, "El nombre no puede superar los 50 caracteres")
      .optional()
      .nullable(),
    apellido: z
      .string()
      .max(50, "El apellido no puede superar los 50 caracteres")
      .optional()
      .nullable(),
    nacionalidad: z
      .string()
      .max(80, "La nacionalidad no puede superar los 80 caracteres")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => !!((data.dni || "").trim() || (data.telefono || "").trim()),
    {
      message: "DNI o teléfono son requeridos para paciente presencial",
      path: ["dni"],
    },
  );
