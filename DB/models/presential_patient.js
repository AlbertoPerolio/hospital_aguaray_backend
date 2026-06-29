import { DataTypes } from "sequelize";
import sequelize from "../instance.js";

/**
 * Modelo para Pacientes Presenciales:
 * Almacena datos de personas sin cuenta registrada que solicitan turnos en el hospital.
 */
const presentialPatient = sequelize.define(
  "presential_patient",
  {
    id_patient_record: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    dni: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    telefono: {
      // Teléfono en texto plano para poder mostrarlo en frontend (no es reversible desde hashes)
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dni_sha256: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    },
    telefono_sha256: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    },
    nacionalidad: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "presential_patient",
    timestamps: true,
  },
);

export default presentialPatient;
