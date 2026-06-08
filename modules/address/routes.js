import express from "express";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { validateSchema } from "../../middleware/validator.middleware.js";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../../schema/address.schema.js";
import addressController from "./controller.js";
import * as answers from "../../errors/answer.js";
import { checkRole, ROLES } from "../../middleware/role.middleware.js";

const router = express.Router();
const ctrl = addressController();

// 1. Obtener mis direcciones (GET /api/address)
router.get("/", verifyJWT, async (req, res, next) => {
  try {
    const list = await ctrl.myAddresses(req.user.id_user);
    return answers.success(req, res, list, 200);
  } catch (err) {
    next(err);
  }
});

// 2. Agregar una dirección (POST /api/address)
router.post(
  "/",
  verifyJWT,
  validateSchema(createAddressSchema),
  async (req, res, next) => {
    try {
      const newAddress = await ctrl.add(req.body, req.user.id_user);
      return answers.success(req, res, newAddress, 201);
    } catch (err) {
      next(err);
    }
  },
);

// 2.b Agregar dirección a un usuario ajeno (Admin/Secretario)
router.post(
  "/admin/:id_user",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  validateSchema(createAddressSchema),
  async (req, res, next) => {
    try {
      const newAddress = await ctrl.add(
        req.body,
        parseInt(req.params.id_user, 10),
      );
      return answers.success(req, res, newAddress, 201);
    } catch (err) {
      next(err);
    }
  },
);

// 3. Editar una dirección (PUT /api/address/:id)
router.put(
  "/:id",
  verifyJWT,
  validateSchema(updateAddressSchema),
  async (req, res, next) => {
    try {
      const updated = await ctrl.update(req.params.id, req.body, req.user);
      return answers.success(req, res, updated, 200);
    } catch (err) {
      next(err);
    }
  },
);

// 4. Eliminar una dirección (DELETE /api/address/:id)
router.delete("/:id", verifyJWT, async (req, res, next) => {
  try {
    const result = await ctrl.del(req.params.id, req.user);
    return answers.success(req, res, result.mensaje, 200);
  } catch (err) {
    next(err);
  }
});

export default router;
