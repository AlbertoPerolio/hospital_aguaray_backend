import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import multer from "multer";
import createError from "../Errors/createError.js";

config();

// 1. Conexión clásica a la API
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configuramos Multer para recibir el archivo en la memoria RAM temporalmente
const storage = multer.memoryStorage();
export const uploadImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por foto
});

// 3. Función estrella para subir el buffer directo a Cloudinary
export const uploadImageToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "libreria_productos", // Carpeta en Cloudinary
      },
      (error, result) => {
        if (error) {
          return reject(
            createError("Error al subir la imagen a Cloudinary", 502),
          );
        }
        resolve(result); // Nos devuelve la URL final y datos de la foto
      },
    );

    // Escribimos el búfer de la imagen en el stream de subida
    uploadStream.end(fileBuffer);
  });
};
