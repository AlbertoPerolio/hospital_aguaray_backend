import { DataTypes } from "sequelize";
import sequelize from "../instance.js";
import doctor from "./doctor.js";
import user from "./user.js";
import presentialPatient from "./presential_patient.js";

const turn = sequelize.define(
  "turn",
  {
    id_turn: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    id_doctor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: doctor,
        key: "id_doctor",
      },
    },

    id_user: {
      // Ahora es opcional, para permitir pacientes que no están registrados en la web
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: user,
        key: "id_user",
      },
    },

    id_patient_record: {
      // Relación con el paciente presencial (creado por el secretario)
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: presentialPatient,
        key: "id_patient_record",
      },
    },

    date: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PENDIENTE",
    },

    modifiedBy: {
      // id_user del secretario que modifica (confirmar/cancelar)
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "turn",
    timestamps: true,
  },
);

export default turn;
