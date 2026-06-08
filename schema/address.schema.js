import { z } from "zod";

export const createAddressSchema = z.object({
  street: z
    .string({ required_error: "La calle es requerida" })
    .min(2, { message: "La calle debe tener al menos 2 caracteres" })
    .max(100, { message: "La calle no puede superar los 100 caracteres" }),

  number: z
    .number({ required_error: "La altura (número) es requerida" })
    .int({ message: "La altura debe ser un número entero" })
    .positive({ message: "La altura debe ser un número positivo" }),

  floor: z
    .string()
    .max(10, { message: "El piso no puede superar los 10 caracteres" })
    .optional()
    .nullable(),

  apartment: z
    .string()
    .max(10, { message: "El departamento no puede superar los 10 caracteres" })
    .optional()
    .nullable(),

  postalCode: z
    .string({ required_error: "El código postal es requerido" })
    .min(2, { message: "Código postal no válido" })
    .max(10, {
      message: "El código postal no puede superar los 10 caracteres",
    }),

  city: z
    .string({ required_error: "La ciudad es requerida" })
    .min(2, { message: "La ciudad debe tener al menos 2 caracteres" })
    .max(100, { message: "La ciudad no puede superar los 100 caracteres" }),

  province: z
    .string({ required_error: "La provincia es requerida" })
    .min(2, { message: "La provincia debe tener al menos 2 caracteres" })
    .max(100, { message: "La provincia no puede superar los 100 caracteres" }),

  description: z
    .string()
    .max(150, { message: "La descripción no puede superar los 150 caracteres" })
    .optional()
    .nullable(),
});

export const updateAddressSchema = createAddressSchema.partial();
