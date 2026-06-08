import { DataTypes } from "sequelize";
import sequelize from "../instance.js";
const permission = sequelize.define("permission", {
  id_permission: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING(50), allowNull: false, unique: true }, // "product:create", "user:delete"
  description: { type: DataTypes.STRING(100) }, // "Permite subir productos nuevos"
});

export default permission;
