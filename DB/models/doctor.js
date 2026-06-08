import { DataTypes } from "sequelize";
import sequelize from "../instance.js";

const doctor = sequelize.define(
  "doctor",
  {
    id_doctor: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    surname: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    specialty: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "doctor",
    timestamps: true,
  },
);

export default doctor;
