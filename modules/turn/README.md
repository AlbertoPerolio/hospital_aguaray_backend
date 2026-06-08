# Turn module

Este módulo se agregará para crear turnos por usuario y confirmarlos/cancelarlos por secretario.

Endpoints (objetivo):

- Usuario:
  - POST /turn (pedir turno)
  - GET /turn/my (mis turnos)
- Secretario/Admin:
  - GET /turn/pending (turnos pendientes a confirmar)
  - PUT /turn/:id/confirm
  - PUT /turn/:id/cancel
