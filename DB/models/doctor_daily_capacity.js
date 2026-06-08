import { DataTypes } from "sequelize";
import sequelize from "../instance.js";
import doctor from "./doctor.js";

const doctorDailyCapacity = sequelize.define(
  "doctor_daily_capacity",
  {
    id_capacity: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: DataTypes.STRING(10), // Formato YYYY-MM-DD
      allowNull: false,
    },
    id_doctor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: doctor, key: "id_doctor" },
    },
    limit_turns: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "doctor_daily_capacity",
    timestamps: true,
  },
);

export default doctorDailyCapacity;
