# Próximo paso: edición de usuario ajeno + hasheo de DNI/teléfono

## Objetivo

- Permitir que **admin (id_role=3)** y **secretario (id_role=2)** editen datos de **otros usuarios**.
- Incluir campos:
  - `name`, `surname`
  - `dni` (guardado hasheado)
  - `nacionalidad`
  - `telefono` (guardado hasheado)

## Por qué

Ahora el backend permite editar solo el perfil propio (`PUT /user-management/profile`) y listar/ cambiar rol, pero no edita datos ajenos.
Además, aunque el modelo tiene `dni` y `telefono`, la lógica todavía no los hashea al guardar/editar.

## Cambios requeridos (backend)

1. **Actualizar `backend/modules/user/controller.js`**
   - Agregar método `updateUserByAdmin({ id_user, data, currentUser })`.
   - Hashear:
     - `dni` con `bcrypt.hash(dni, salt)`
     - `telefono` con `bcrypt.hash(telefono, salt)`
   - Permitir editar solo los campos permitidos.
2. **Actualizar `backend/modules/user/routes.js`**
   - Agregar endpoint protegido por rol:
     - `PUT /user-management/admin/user/:id`
3. **Actualizar `backend/schema/auth.schema.js`**
   - Crear schema `updateUserForeignSchema` (reutilizar el que ya existe si aplica, pero ideal separar para los campos admin/secretario).

## Cambios requeridos (frontend)

- Actualizar el panel Admin/Secretario en `Profile.jsx` para que tenga:
  - Inputs para editar `name`, `surname`, `dni`, `nacionalidad`, `telefono`.
  - Llamada al endpoint nuevo.
- (Opcional) UI para mostrar/ocultar el hash.

## Notas

- Usar `sequelize.sync({ force:true })` ya se configuró, pero hay que asegurar que los endpoints protegen las acciones sensibles.
