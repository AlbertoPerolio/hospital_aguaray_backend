import { DataTypes } from "sequelize";
import sequelize from "../instance.js";
import user from "./user.js";

const address = sequelize.define(
  "address",
  {
    id_address: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_user: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // 1 dirección por usuario
      references: {
        model: user,
        key: "id_user",
      },
    },
    street: {
      type: DataTypes.STRING(100),
      allowNull: false, // Calle
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false, // Altura
    },
    floor: {
      type: DataTypes.STRING(10),
      allowNull: true, // Piso (opcional)
    },
    apartment: {
      type: DataTypes.STRING(10),
      allowNull: true, // Departamento (opcional)
    },
    postalCode: {
      type: DataTypes.STRING(10),
      allowNull: false, // Código Postal
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false, // Ciudad
    },
    province: {
      type: DataTypes.STRING(100),
      allowNull: false, // Provincia
    },
    description: {
      type: DataTypes.STRING(150),
      allowNull: true, // Ej: "Portón azul", "Dejar en portería"
    },
  },
  {
    tableName: "address",
    timestamps: true,
  },
);

export default address;
