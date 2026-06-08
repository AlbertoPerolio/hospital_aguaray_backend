import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import config from "./config.js";

// imp rutas
import register from "../modules/register/routes.js";
import auth from "../modules/auth/routes.js";
import userManagement from "../modules/user/routes.js";
import address from "../modules/address/routes.js";
import googleAuth from "../modules/googleAuth/routes.js";
import doctorRoutes from "../modules/doctor/routes.js";
import turnRoutes from "../modules/turn/routes.js";
import patientRoutes from "../modules/patient/routes.js";

// imp errors
import errors from "../errors/errors.js";

// rate limiters
import {
  turnRateLimiter,
  turnConfirmRateLimiter,
} from "./middleware/rateLimit.middleware.js";

// sequelize
import { connect } from "../DB/sequelize.js";
await connect();

const app = express();

//config CORS
const allowedOrigins = ["https://hospital-aguaray.vercel.app"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `La política de CORS no permite el acceso desde este origen: ${origin}`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

io.on("connection", (socket) => {
  console.log("Hola socket conectado");
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

//rutas
app.use("/api/user", register);
app.use("/api/auth", auth);
app.use("/api/auth/google", googleAuth);

app.use("/api/user-management", userManagement);

app.use("/api/address", address);

app.use("/api/doctor", doctorRoutes);
app.use("/api/turn", turnRoutes);
app.use("/api/patient", patientRoutes);

//errores
app.use(errors);

export { app, httpServer, io };
