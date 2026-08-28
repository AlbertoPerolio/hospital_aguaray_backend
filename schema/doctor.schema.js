import { z } from "zod";

export const createDoctorSchema = z.object({
  name: z
    .string({ required_error: "El nombre es requerido" })
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre no puede superar los 100 caracteres" }),

  surname: z
    .string({ required_error: "El apellido es requerido" })
    .min(2, { message: "El apellido debe tener al menos 2 caracteres" })
    .max(100, { message: "El apellido no puede superar los 100 caracteres" }),

  specialty: z
    .string({ required_error: "La especialidad es requerida" })
    .min(2, { message: "La especialidad debe tener al menos 2 caracteres" })
    .max(100, {
      message: "La especialidad no puede superar los 100 caracteres",
    }),
});

export const dailyCapacitySchema = z.object({
  date: z
    .string({ required_error: "La fecha es requerida" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida (YYYY-MM-DD)" }),

  rows: z
    .array(
      z.object({
        id_doctor: z.number().int().positive(),
        enabled: z.boolean(),
        limit_turns: z.number().int().min(0),
      }),
    )
    .min(1, { message: "Debe enviar al menos un doctor" }),
});
