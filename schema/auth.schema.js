import { z } from "zod";

// Permite vacío (campo no informado); si viene con valor, debe ser solo dígitos
// y tener una longitud dentro de [min, max].
const digitsOrEmpty = (min, max, label) =>
  z
    .string()
    .refine((v) => v === "" || new RegExp(`^\\d{${min},${max}}$`).test(v), {
      message: `${label} debe contener solo números y tener entre ${min} y ${max} dígitos`,
    })
    .optional()
    .nullable();

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Nombre no válido" })
    .max(50, { message: "El nombre no puede superar los 50 caracteres" })
    .optional(),
  surname: z
    .string()
    .min(1, { message: "Apellido no válido" })
    .max(50, { message: "El apellido no puede superar los 50 caracteres" })
    .optional(), // Sincronizado con la base
  user: z
    .string()
    .min(1, { message: "Usuario no válido" })
    .max(40, { message: "El usuario no puede superar los 40 caracteres" })
    .optional(),
  email: z.string().email({ message: "Email no válido" }).optional(),

  // Datos extendidos (paciente)
  dni: digitsOrEmpty(7, 8, "El DNI"),
  nacionalidad: z
    .string()
    .max(80, { message: "La nacionalidad no puede superar los 80 caracteres" })
    .optional()
    .nullable(),
  telefono: digitsOrEmpty(10, 15, "El teléfono"),

  fechaNacimiento: z
    .string()
    .refine(
      (val) => {
        if (!val) return true; // vacío permitido
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
        const today = new Date().toLocaleDateString("sv-SE", {
          timeZone: "America/Argentina/Buenos_Aires",
        });
        return val >= "1900-01-01" && val <= today;
      },
      {
        message:
          "La fecha de nacimiento debe estar entre 1900 y hoy (YYYY-MM-DD)",
      },
    )
    .optional(),

  // Persona sin domicilio en Argentina (exime de cargar dirección)
  noDomicilioArgentina: z.boolean().optional(),
});
export const updateRoleSchema = z.object({
  id_role: z
    .number({ required_error: "El ID de rol es requerido" })
    .int()
    .positive(),
});

export const loginSchema = z.object({
  user: z.string({
    required_error: "Usuario es requerido",
  }),
  password: z
    .string({
      required_error: "Contraseña es requerida",
    })
    .min(6, {
      message: "La contraseña tiene que tener al menos 6 caracteres",
    }),
});

export const resetPasswordSchema = z.object({
  user: z.string({ required_error: "El usuario o email es requerido" }),
  securityAnswer: z
    .string({ required_error: "La respuesta de seguridad es requerida" })
    .min(1, { message: "La respuesta no puede estar vacía" })
    .transform((val) => val.toLowerCase().trim()),
  newPassword: z
    .string({ required_error: "La nueva contraseña es requerida" })
    .min(6, {
      message: "La nueva contraseña debe tener al menos 6 caracteres",
    }),
});

export const googleAuthSchema = z.object({
  // id_token de Google (GIS)
  credential: z
    .string({ required_error: "credential (id_token) requerido" })
    .min(1),
});

// Esquema del módulo `register` (NO montado en app.js). Se mantiene para que
// el import de modules/register/routes.js resuelva; el registro real es solo
// con Google y el modelo `user` no tiene columnas de contraseña/seguridad.
export const registerSchema = z.object({
  email: z.string({ required_error: "El email es requerido" }).email(),
  user: z.string({ required_error: "El usuario es requerido" }).min(1),
  password: z.string({ required_error: "La contraseña es requerida" }).min(6),
  securityAnswer: z
    .string({ required_error: "La respuesta de seguridad es requerida" })
    .min(1),
  name: z.string().optional(),
  surname: z.string().optional(),
  nacionalidad: z.string().optional(),
  securityQuestionId: z.number().optional(),
  dni: z.string().optional(),
  telefono: z.string().optional(),
});
