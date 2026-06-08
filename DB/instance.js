// src/DB/instance.js
import { Sequelize } from "sequelize";
import config from "../src/config.js";

const sequelize = new Sequelize(
  config.Base.database,
  config.Base.user,
  config.Base.password,
  {
    host: config.Base.host,
    port: config.Base.port,
    dialect: config.Base.dialect,
    logging: false,
    dialectOptions: {},

    // Guardar timestamps con timezone Argentina (ART = UTC-3)
    timezone: "America/Argentina/Buenos_Aires",
  },
);

export default sequelize;
