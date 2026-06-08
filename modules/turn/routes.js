import express from "express";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { checkRole, ROLES } from "../../middleware/role.middleware.js";
import turnController from "./controller.js";
import {
  turnRateLimiter,
  turnConfirmRateLimiter,
} from "../../src/middleware/rateLimit.middleware.js";

const router = express.Router();
const ctrl = turnController();

// Usuario pide turno
router.post(
  "/",
  turnRateLimiter,
  verifyJWT,
  checkRole([ROLES.USER, ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const { id_doctor, date, id_user, id_patient_record } = req.body;

      // Si es un usuario común, solo puede pedir para sí mismo.
      // Si es Staff, puede usar los IDs enviados en el body.
      const targetUser =
        req.user.id_role === ROLES.USER ? req.user.id_user : id_user;

      // Regla paciente: solo puede pedir para el día de hoy
      if (req.user.id_role === ROLES.USER) {
        // Fecha “hoy” en Argentina (ART = UTC-3). Evita problemas de zona horaria en el hosting.
        const now = new Date();
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000; // a UTC
        const artMs = utcMs - 3 * 60 * 60 * 1000; // UTC-3
        const artDate = new Date(artMs);

        const yyyy = artDate.getUTCFullYear();
        const mm = String(artDate.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(artDate.getUTCDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        if (date !== todayStr) {
          const err = new Error(
            "Los pacientes solo pueden pedir turno para hoy",
          );
          err.statusCode = 400;
          throw err;
        }
      }

      const created = await ctrl.requestTurn({
        id_doctor: parseInt(id_doctor, 10),
        date,
        id_user: targetUser,
        id_patient_record: id_patient_record || null,
      });

      return res.json({ error: false, body: created });
    } catch (err) {
      next(err);
    }
  },
);

// Mis turnos
router.get(
  "/my",
  verifyJWT,
  checkRole([ROLES.USER, ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const list = await ctrl.myTurns(req.user.id_user);
      return res.json({ error: false, body: list });
    } catch (err) {
      next(err);
    }
  },
);

// Pending (secretario/admin)
router.get(
  "/pending",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const list = await ctrl.pendingTurns();
      return res.json({ error: false, body: list });
    } catch (err) {
      next(err);
    }
  },
);

// Historial (secretario/admin)
router.get(
  "/history",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const status = req.query.status || "ALL";
      const list = await ctrl.allTurnsWithFilter({ status });
      return res.json({ error: false, body: list });
    } catch (err) {
      next(err);
    }
  },
);

// Confirmar
router.put(
  "/:id_turn/confirm",
  turnConfirmRateLimiter,
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const updated = await ctrl.confirmTurn(
        parseInt(req.params.id_turn, 10),
        req.user.id_user,
      );
      return res.json({ error: false, body: updated });
    } catch (err) {
      next(err);
    }
  },
);

// Cancelar
router.put(
  "/:id_turn/cancel",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const updated = await ctrl.cancelTurn(parseInt(req.params.id_turn, 10));
      return res.json({ error: false, body: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
