import "dotenv/config.js";

const config = {
  app: {
    port: process.env.PORT || 5000,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  Base: {
    host: process.env.Base_HOST || "aaa",
    user: process.env.Base_USER || "wakawaka",
    password: process.env.Base_PASSWORD || "",
    database: process.env.Base_DB || "ninguna",
    port: process.env.Base_PORT || 3306,
    dialect: process.env.Base_DIALECT || "AAA",
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
};

export default config;
