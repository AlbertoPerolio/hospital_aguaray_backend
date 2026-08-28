import { z } from "zod";

export const requestTurnSchema = z.object({
  id_doctor: z
    .number({ required_error: "El doctor es requerido" })
    .int()
    .positive(),

  date: z
    .string({ required_error: "La fecha es requerida" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida (YYYY-MM-DD)" }),

  id_user: z.number().int().positive().optional().nullable(),

  id_patient_record: z.number().int().positive().optional().nullable(),
});
