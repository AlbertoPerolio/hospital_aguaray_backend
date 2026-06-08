import express from "express";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { checkRole, ROLES } from "../../middleware/role.middleware.js";
import doctorController from "./controller.js";

const router = express.Router();
const ctrl = doctorController();

// Público: listar doctores
router.get("/", async (req, res, next) => {
  try {
    const list = await ctrl.listAll();
    return res.json({ error: false, body: list });
  } catch (err) {
    next(err);
  }
});

// Admin/Secretario: crear doctor
router.post(
  "/",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const created = await ctrl.createDoctor(req.body);
      return res.json({ error: false, body: created });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/:id_doctor",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const result = await ctrl.deleteDoctor(
        parseInt(req.params.id_doctor, 10),
      );
      return res.json({ error: false, body: result });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/:id_doctor/activate",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const doc = await ctrl.setActivo(
        parseInt(req.params.id_doctor, 10),
        true,
      );
      return res.json({ error: false, body: doc });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  "/:id_doctor/pause",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const doc = await ctrl.setActivo(
        parseInt(req.params.id_doctor, 10),
        false,
      );
      return res.json({ error: false, body: doc });
    } catch (err) {
      next(err);
    }
  },
);

// Admin/Secretario: setear availability + cupos por fecha
router.put(
  "/daily-capacity",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const { date, rows } = req.body; // rows: [{id_doctor, enabled, limit_turns}]
      const result = await ctrl.setDailyCapacitiesForDate({ date, rows });
      return res.json({ error: false, body: result });
    } catch (err) {
      next(err);
    }
  },
);

// Público: doctores disponibles para fecha
router.get("/available", async (req, res, next) => {
  try {
    const { date } = req.query;
    const result = await ctrl.listAvailableForDate(date);
    return res.json({ error: false, body: result });
  } catch (err) {
    next(err);
  }
});

export default router;
