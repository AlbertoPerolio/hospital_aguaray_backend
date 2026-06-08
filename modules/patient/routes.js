import express from "express";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { checkRole, ROLES } from "../../middleware/role.middleware.js";
import patientController from "./controller.js";

const router = express.Router();
const ctrl = patientController();

// Endpoint para autocompletar datos de pacientes presenciales (Búsqueda por DNI/Teléfono vía SHA256)
router.get(
  "/autocomplete",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const { dni, telefono } = req.query;
      const list = await ctrl.autocomplete({ dni, telefono });
      return res.json({ error: false, body: list });
    } catch (err) {
      next(err);
    }
  },
);

// Endpoint para crear o actualizar un registro de paciente presencial
router.post(
  "/upsert",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const created = await ctrl.upsertPatient(req.body, req.user.id_user);
      return res.json({ error: false, body: created });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
