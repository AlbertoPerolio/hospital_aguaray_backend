// El login local (usuario/contraseña) y el reset de contraseña están
// DESHABILITADOS: el acceso es exclusivamente con Google.
// Ver modules/auth/routes.js, que responden 403 en /login y /reset-password.
export default function authController() {
  return {};
}
