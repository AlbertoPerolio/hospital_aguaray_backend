# Patient module (presencial)

Si se implementa el flujo de paciente presencial con autocompletado,
este módulo manejará el registro de pacientes 'no usuarios' (snapshot o entidad).

Endpoints (objetivo):

- Secretario/Admin:
  - POST /patient/presencial
  - GET /patient/presencial/search?dni=... (o por nombre+tel)
