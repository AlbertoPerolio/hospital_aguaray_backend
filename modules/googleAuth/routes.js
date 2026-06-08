import express from "express";
import controller from "./index.js";
import { validateSchema } from "../../middleware/validator.middleware.js";
import { googleAuthSchema } from "../../schema/auth.schema.js";
import jwt from "jsonwebtoken";
import config from "../../src/config.js";

const router = express.Router();

router.post("/", validateSchema(googleAuthSchema), async (req, res) => {
  try {
    const token = await controller.googleLoginOrSignup(req.body);
    const decodedUser = jwt.verify(token, config.jwt.secret);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      error: false,
      body: { mensaje: "Login con Google exitoso" },
      user: decodedUser,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: true,
      body: { mensaje: err.message },
    });
  }
});

export default router;
