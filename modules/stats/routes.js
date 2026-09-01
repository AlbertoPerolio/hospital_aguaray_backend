import express from "express";
import { verifyJWT } from "../../middleware/auth.middleware.js";
import { checkRole, ROLES } from "../../middleware/role.middleware.js";
import statsController from "./controller.js";

const router = express.Router();
const ctrl = statsController();

// Dashboard de estadísticas (JSON) para Admin/Secretario
router.get(
  "/dashboard",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const data = await ctrl.getDashboard(req.query);
      return res.json({ error: false, body: data });
    } catch (err) {
      next(err);
    }
  },
);

// Descarga de estadísticas en Excel (generado en el servidor)
router.get(
  "/export",
  verifyJWT,
  checkRole([ROLES.ADMIN, ROLES.SECRETARY]),
  async (req, res, next) => {
    try {
      const { buffer, filename } = await ctrl.exportExcel(req.query);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
