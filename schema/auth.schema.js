import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().min(1, { message: "Nombre no válido" }).optional(),
    surname: z.string().min(1, { message: "Apellido no válido" }).optional(), // Sincronizado con la base
    user: z.string().min(1, { message: "Usuario no válido" }).optional(),
    email: z.string().email({ message: "Email no válido" }).optional(),

    // Datos extendidos (paciente)
    dni: z.string().min(1, { message: "DNI inválido" }).optional(),
    nacionalidad: z
      .string()
      .min(1, { message: "Nacionalidad inválida" })
      .optional(),
    telefono: z.string().min(1, { message: "Teléfono inválido" }).optional(),

    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida" })
      .optional(),

    password: z
      .string()
      .min(6, {
        message: "La nueva contraseña debe tener al menos 6 caracteres",
      })
      .optional(),
    currentPassword: z.string().optional(),

    securityQuestionId: z.number().optional(), // Permite cambiar la pregunta si quiere
    securityAnswer: z
      .string()
      .min(1, { message: "La respuesta no puede estar vacía" })
      .optional(), // Nueva respuesta opcional
    currentSecurityAnswer: z.string().optional(), // Respuesta actual de control
  })
  // 🔐 Validación cruzada para la CONTRASEÑA
  .refine(
    (data) => {
      if (data.password) {
        return !!data.currentPassword; // Si hay contraseña nueva, la actual es obligatoria
      }
      return true;
    },
    {
      message:
        "Si proporciona una nueva contraseña, debe ingresar la contraseña actual.",
      path: ["currentPassword"],
    },
  )
  .refine(
    (data) => {
      if (data.securityAnswer) {
        return !!data.currentSecurityAnswer; // Si hay respuesta nueva, la actual es obligatoria
      }
      return true;
    },
    {
      message:
        "Si cambia su respuesta de seguridad, debe ingresar la respuesta de seguridad actual.",
      path: ["currentSecurityAnswer"],
    },
  );
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
