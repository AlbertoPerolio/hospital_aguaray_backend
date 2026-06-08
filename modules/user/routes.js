import express from "express";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { checkRole, ROLES } from "../../middleware/role.middleware.js";
import { validateSchema } from "../../middleware/validator.middleware.js";
import {
  updateRoleSchema,
  updateUserSchema,
} from "../../schema/auth.schema.js";
import userController from "./controller.js";
import * as answers from "../../errors/answer.js";

const router = express.Router();
const ctrl = userController();

// Ver mi perfil (GET /api/user-management/profile)
router.get("/profile", verifyJWT, async (req, res, next) => {
  try {
    const profile = await ctrl.getProfile(req.user.id_user);
    return answers.success(req, res, profile, 200);
  } catch (err) {
    next(err);
  }
});

// Editar mi perfil (PUT /api/user-management/profile)
router.put(
  "/profile",
  verifyJWT,
  validateSchema(updateUserSchema),
  async (req, res, next) => {
    try {
      const updated = await ctrl.updateProfile(req.user.id_user, req.body);
      return answers.success(req, res, updated, 200);
    } catch (err) {
      next(err);
    }
  },
);

// Listar todos los usuarios (GET /api/user-management/admin/all)
router.get(
  "/admin/all",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const users = await ctrl.getAllUsers();
      return answers.success(req, res, users, 200);
    } catch (err) {
      next(err);
    }
  },
);

// Buscar usuarios por DNI o Teléfono (GET /api/user-management/admin/search)
router.get(
  "/admin/search",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const { dni, telefono } = req.query;
      const users = await ctrl.searchUsers({ dni, telefono });
      return answers.success(req, res, users, 200);
    } catch (err) {
      next(err);
    }
  },
);

// Cambiar rol de un usuario (PUT /api/user-management/admin/role/:id)
router.put(
  "/admin/role/:id",
  verifyJWT,
  checkRole([ROLES.ADMIN]),
  validateSchema(updateRoleSchema),
  async (req, res, next) => {
    try {
      const result = await ctrl.changeRole(
        parseInt(req.params.id, 10),
        req.body.id_role,
      );
      return answers.success(req, res, result.mensaje, 200);
    } catch (err) {
      next(err);
    }
  },
);

// Editar datos de un usuario ajeno (PUT /api/user-management/admin/user/:id)
router.put(
  "/admin/user/:id",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  validateSchema(updateUserSchema),
  async (req, res, next) => {
    try {
      const updated = await ctrl.updateUserByAdmin({
        id_user: parseInt(req.params.id, 10),
        data: req.body,
      });
      return answers.success(req, res, updated, 200);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
