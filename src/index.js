import { httpServer } from "./app.js";
import config from "./config.js";

// Usamos httpServer para escuchar, ya que es el que tiene Socket.IO configurado.
httpServer.listen(config.app.port, () => {
  console.log("Server on port", config.app.port);
});
