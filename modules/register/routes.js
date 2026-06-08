import express from "express";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import {
  checkRole,
  isOwnerOrAdmin,
  ROLES,
} from "../../middleware/role.middleware.js";
import { validateSchema } from "../../middleware/validator.middleware.js";
import { registerSchema, updateUserSchema } from "../../schema/auth.schema.js";
import controller from "./index.js";
import * as answers from "../../errors/answer.js";

const router = express.Router();

// ==========================================
//                 RUTAS
// ==========================================

// 1. Ver todos los usuarios -> Solo administradores pueden listarlos
router.get("/", verifyJWT, checkRole([ROLES.ADMIN]), all);

// 2. Ver un usuario específico -> Tenés que ser el Admin o el dueño de la cuenta
// Usamos "id" porque mapea directo con req.params.id
router.get("/:id", verifyJWT, isOwnerOrAdmin("id"), one);

// 3. Crear / Registrar usuario -> Ruta pública (Cualquiera se puede registrar)
// Le agregamos el validador de Zod para que no entren datos rotos a la base
router.post("/", validateSchema(registerSchema), addCreate);

// 4. Actualizar usuario completo -> Tenés que ser el Admin o el dueño de la cuenta
router.put(
  "/:id",
  verifyJWT,
  isOwnerOrAdmin("id"),
  validateSchema(updateUserSchema),
  updateUserRoute,
);

// 5. Actualizar solo rol -> Solo el Admin puede cambiarle el rol a alguien
router.put("/:id/role", verifyJWT, checkRole([ROLES.ADMIN]), updateRoleRoute);

// 6. Eliminar usuario -> Solo el Admin puede borrar cuentas
router.delete("/:id", verifyJWT, checkRole([ROLES.ADMIN]), del);

// ==========================================
//          FUNCIONES DE CONTROLADORES
// ==========================================

async function all(req, res, next) {
  try {
    const users = await controller.all();
    return answers.success(req, res, users, 200);
  } catch (err) {
    next(err);
  }
}

async function one(req, res, next) {
  try {
    const user = await controller.one(req.params.id);
    return answers.success(req, res, user, 200);
  } catch (err) {
    next(err);
  }
}

async function addCreate(req, res, next) {
  try {
    const user = await controller.add(req.body);
    return answers.success(req, res, user, 201);
  } catch (err) {
    next(err);
  }
}

async function updateUserRoute(req, res, next) {
  try {
    const id_user = req.params.id;
    const result = await controller.updateUser(id_user, req.body);

    // Si tu update también regenera el token, acá podrías meter la cookie fresca
    return answers.success(req, res, result, 200);
  } catch (err) {
    next(err); // Centralizamos el catch usando tu errors.js original
  }
}

async function updateRoleRoute(req, res, next) {
  try {
    const id_user = req.params.id;
    const { id_role } = req.body; // Acordate que ahora mandás "id_role" numérico desde el front

    const updatedUser = await controller.updateRole(id_user, id_role);
    return answers.success(req, res, updatedUser, 200);
  } catch (err) {
    next(err);
  }
}

async function del(req, res, next) {
  try {
    await controller.del(req.params.id);
    return answers.success(req, res, "Usuario eliminado", 200);
  } catch (err) {
    next(err);
  }
}

export default router;
