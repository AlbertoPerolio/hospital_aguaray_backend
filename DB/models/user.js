import { DataTypes } from "sequelize";
import sequelize from "../instance.js";

const user = sequelize.define(
  "user",
  {
    id_user: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    user: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    surname: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Datos extendidos (paciente)
    // NOTA: dni/telefono se guardan hasheados
    dni: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dni_sha256: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    },
    nacionalidad: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    telefono_sha256: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    },

    securityQuestionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    securityAnswer: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    googleId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    id_role: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // roles posibles: 1, 2, 3
    },
  },
  {
    tableName: "user",
    timestamps: true, // crea createdAt y updatedAt automáticamente
  },
);

export default user;
