# Doctor module

Este módulo se agregará para gestionar doctores (CRUD) y disponibilidad/capacidad diaria.

Endpoints (objetivo):

- Admin/Secretario:
  - POST /doctor
  - PUT /doctor/:id
  - DELETE /doctor/:id
  - PATCH /doctor/:id/activate
  - PATCH /doctor/:id/pause
  - PUT /doctor-daily-capacity (setear para una fecha)
- Usuario:
  - GET /doctor/available?date=YYYY-MM-DD (doctores habilitados para la fecha)
