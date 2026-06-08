import { DataTypes } from "sequelize";
import sequelize from "../instance.js";
const role = sequelize.define("role", {
  id_role: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(30), allowNull: false, unique: true }, // admin, seller, client
});

export default role;
