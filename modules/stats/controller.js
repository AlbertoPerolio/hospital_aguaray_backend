import { QueryTypes } from "sequelize";
import ExcelJS from "exceljs";
import sequelize from "../../DB/instance.js";

// Fecha "hoy" en Argentina (ART = UTC-3), alineada con el resto del backend.
function todayArg() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function normDate(value, fallback) {
  const s = (value || "").toString().trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

async function run(sql, replacements) {
  return sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
}

// ============================================================================
// CÁLCULO DE ESTADÍSTICAS (todo en SQL, en el servidor)
// ============================================================================
async function computeStats({ desde, hasta, fecha } = {}) {
  const today = todayArg();
  const dDesde = normDate(desde, today);
  const dHasta = normDate(hasta, today);
  const dFecha = normDate(fecha, today);

  const [
    turnosPorEstado,
    turnosPorDia,
    turnosPorDoctor,
    turnosPorEspecialidad,
    ocupacionPorDoctor,
    pacientesPorNacionalidad,
    pacientesPorEdad,
    pacientesPorProvincia,
    nuevosRegistradosPorDia,
    doctoresDisponiblesResumen,
    especialidades,
    extranjeros,
    totalRegistrados,
    totalPresenciales,
    pacientesDelDia,
  ] = await Promise.all([
    run(
      `SELECT status, COUNT(*)::int AS total
       FROM "turn"
       WHERE date >= :desde AND date <= :hasta
       GROUP BY status`,
      { desde: dDesde, hasta: dHasta },
    ),
    run(
      `SELECT date,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'PENDIENTE')::int AS pendientes,
              COUNT(*) FILTER (WHERE status = 'CONFIRMADO')::int AS confirmados,
              COUNT(*) FILTER (WHERE status = 'CANCELADO')::int AS cancelados
       FROM "turn"
       WHERE date >= :desde AND date <= :hasta
       GROUP BY date
       ORDER BY date`,
      { desde: dDesde, hasta: dHasta },
    ),
    run(
      `SELECT d.surname, d.name, d.specialty,
              COUNT(t.id_turn)::int AS total,
              COUNT(t.id_turn) FILTER (WHERE t.status = 'PENDIENTE')::int AS pendientes,
              COUNT(t.id_turn) FILTER (WHERE t.status = 'CONFIRMADO')::int AS confirmados,
              COUNT(t.id_turn) FILTER (WHERE t.status = 'CANCELADO')::int AS cancelados
       FROM "doctor" d
       LEFT JOIN "turn" t
         ON t.id_doctor = d.id_doctor AND t.date >= :desde AND t.date <= :hasta
       GROUP BY d.id_doctor, d.surname, d.name, d.specialty
       ORDER BY total DESC`,
      { desde: dDesde, hasta: dHasta },
    ),
    run(
      `SELECT d.specialty,
              COUNT(t.id_turn)::int AS total,
              COUNT(t.id_turn) FILTER (WHERE t.status = 'PENDIENTE')::int AS pendientes,
              COUNT(t.id_turn) FILTER (WHERE t.status = 'CONFIRMADO')::int AS confirmados,
              COUNT(t.id_turn) FILTER (WHERE t.status = 'CANCELADO')::int AS cancelados
       FROM "doctor" d
       LEFT JOIN "turn" t
         ON t.id_doctor = d.id_doctor AND t.date >= :desde AND t.date <= :hasta
       GROUP BY d.specialty
       ORDER BY total DESC`,
      { desde: dDesde, hasta: dHasta },
    ),
    run(
      `SELECT d.surname, d.name, d.specialty,
              COALESCE(SUM(dc.limit_turns) FILTER (WHERE dc.enabled = true), 0)::int AS cupos,
              COUNT(t.id_turn)::int AS turnos
       FROM "doctor" d
       LEFT JOIN "doctor_daily_capacity" dc
         ON dc.id_doctor = d.id_doctor AND dc.date >= :desde AND dc.date <= :hasta
       LEFT JOIN "turn" t
         ON t.id_doctor = d.id_doctor
        AND t.date >= :desde AND t.date <= :hasta
        AND t.status IN ('PENDIENTE', 'CONFIRMADO')
       GROUP BY d.id_doctor, d.surname, d.name, d.specialty
       ORDER BY turnos DESC`,
      { desde: dDesde, hasta: dHasta },
    ),
    run(
      `SELECT COALESCE(NULLIF(TRIM(nacionalidad), ''), 'Sin dato') AS nacionalidad,
              COUNT(*)::int AS total
       FROM (
         SELECT nacionalidad FROM "user" WHERE id_role = 1
         UNION ALL
         SELECT nacionalidad FROM "presential_patient"
       ) x
       GROUP BY 1
       ORDER BY total DESC`,
    ),
    run(
      `SELECT
         CASE
           WHEN "fechaNacimiento" IS NULL THEN 'Sin dato'
           WHEN EXTRACT(YEAR FROM AGE("fechaNacimiento")) < 18 THEN '0-17'
           WHEN EXTRACT(YEAR FROM AGE("fechaNacimiento")) BETWEEN 18 AND 30 THEN '18-30'
           WHEN EXTRACT(YEAR FROM AGE("fechaNacimiento")) BETWEEN 31 AND 45 THEN '31-45'
           WHEN EXTRACT(YEAR FROM AGE("fechaNacimiento")) BETWEEN 46 AND 60 THEN '46-60'
           ELSE '60+'
         END AS rango,
         COUNT(*)::int AS total
       FROM "user"
       WHERE id_role = 1
       GROUP BY rango`,
    ),
    run(
      `SELECT COALESCE(NULLIF(TRIM(province), ''), 'Sin dato') AS provincia,
              COUNT(*)::int AS total
       FROM "address"
       GROUP BY 1
       ORDER BY total DESC`,
    ),
    run(
      `SELECT TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS fecha,
              COUNT(*)::int AS total
       FROM "user"
       WHERE id_role = 1
         AND "createdAt"::date BETWEEN :desde::date AND :hasta::date
       GROUP BY 1
       ORDER BY 1`,
      { desde: dDesde, hasta: dHasta },
    ),
    run(
      `SELECT COUNT(*) FILTER (WHERE enabled = true)::int AS disponibles,
              COUNT(*) FILTER (WHERE enabled = false)::int AS noDisponibles
       FROM "doctor_daily_capacity"
       WHERE date = :fecha`,
      { fecha: dFecha },
    ),
    run(`SELECT COUNT(DISTINCT specialty)::int AS total FROM "doctor"`),
    run(`SELECT COUNT(*)::int AS total FROM "user" WHERE "noDomicilioArgentina" = true`),
    run(`SELECT COUNT(*)::int AS total FROM "user" WHERE id_role = 1`),
    run(`SELECT COUNT(*)::int AS total FROM "presential_patient"`),
    run(
      `SELECT
         t.id_turn,
         t.status,
         d.name AS doctor_name,
         d.surname AS doctor_surname,
         d.specialty,
         u.dni AS u_dni,
         u.name AS u_name,
         u.surname AS u_surname,
         u.nacionalidad AS u_nacionalidad,
         u.telefono AS u_telefono,
         TO_CHAR(u."fechaNacimiento", 'YYYY-MM-DD') AS u_fechaNacimiento,
         a.province AS u_province,
         a.city AS u_city,
         pp.dni AS p_dni,
         pp.first_name AS p_name,
         pp.last_name AS p_surname,
         pp.nacionalidad AS p_nacionalidad,
         pp.telefono AS p_telefono
       FROM "turn" t
       LEFT JOIN "doctor" d ON d.id_doctor = t.id_doctor
       LEFT JOIN "user" u ON u.id_user = t.id_user
       LEFT JOIN "address" a ON a.id_user = u.id_user
       LEFT JOIN "presential_patient" pp ON pp.id_patient_record = t.id_patient_record
       WHERE t.date = :fecha
         AND t.status IN ('PENDIENTE', 'CONFIRMADO')
       ORDER BY t.status, u.surname, pp.last_name, u.name, pp.first_name`,
      { fecha: dFecha },
    ),
  ]);

  const totalTurnos = turnosPorEstado.reduce((s, r) => s + Number(r.total), 0);
  const pendientes =
    Number(turnosPorEstado.find((r) => r.status === "PENDIENTE")?.total) || 0;
  const confirmados =
    Number(turnosPorEstado.find((r) => r.status === "CONFIRMADO")?.total) || 0;
  const cancelados =
    Number(turnosPorEstado.find((r) => r.status === "CANCELADO")?.total) || 0;

  const pacientesDelDiaList = pacientesDelDia.map((row) => ({
    dni: row.u_dni || row.p_dni || "-",
    apellido: row.u_surname || row.p_surname || "-",
    nombre: row.u_name || row.p_name || "-",
    nacionalidad: row.u_nacionalidad || row.p_nacionalidad || "-",
    telefono: row.u_telefono || row.p_telefono || "-",
    fechaNacimiento: row.u_fechaNacimiento || "-",
    doctor: [row.doctor_surname, row.doctor_name].filter(Boolean).join(", ") || "-",
    especialidad: row.specialty || "-",
    estado: row.status,
    direccion: row.u_province
      ? [row.u_province, row.u_city].filter(Boolean).join(", ")
      : "-",
  }));

  return {
    rango: { desde: dDesde, hasta: dHasta, fecha: dFecha },
    resumen: {
      totalTurnos,
      pendientes,
      confirmados,
      cancelados,
      tasaConfirmacion: totalTurnos ? Number(((confirmados / totalTurnos) * 100).toFixed(1)) : 0,
      tasaCancelacion: totalTurnos ? Number(((cancelados / totalTurnos) * 100).toFixed(1)) : 0,
      pacientesRegistrados: Number(totalRegistrados[0]?.total) || 0,
      pacientesPresenciales: Number(totalPresenciales[0]?.total) || 0,
      extranjeros: Number(extranjeros[0]?.total) || 0,
      doctoresDisponibles:
        Number(doctoresDisponiblesResumen[0]?.disponibles) || 0,
      doctoresNoDisponibles:
        Number(doctoresDisponiblesResumen[0]?.noDisponibles) || 0,
      especialidades: Number(especialidades[0]?.total) || 0,
    },
    turnosPorDia,
    turnosPorDoctor: turnosPorDoctor.map((r) => ({
      ...r,
      doctor: [r.surname, r.name].filter(Boolean).join(", "),
    })),
    turnosPorEspecialidad,
    ocupacionPorDoctor: ocupacionPorDoctor.map((r) => {
      const doctor = [r.surname, r.name].filter(Boolean).join(", ");
      const cupos = Number(r.cupos) || 0;
      const turnos = Number(r.turnos) || 0;
      return {
        doctor,
        especialidad: r.specialty,
        cupos,
        turnos,
        ocupacion: cupos ? Number(((turnos / cupos) * 100).toFixed(1)) : 0,
      };
    }),
    pacientesPorNacionalidad,
    pacientesPorEdad,
    pacientesPorProvincia,
    nuevosRegistradosPorDia,
    pacientesDelDia: pacientesDelDiaList,
  };
}

// ============================================================================
// EXCEL
// ============================================================================

// Aplica estilos de "tabla" a una hoja: encabezado coloreado/negrita,
// bordes en todas las celdas y primera fila congelada.
function addTableSheet(workbook, sheetName, columns, rows) {
  const ws = workbook.addWorksheet(sheetName);
  ws.columns = columns;
  if (rows.length) ws.addRows(rows);

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" },
  };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;

  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  return ws;
}

async function exportExcel({ desde, hasta, fecha } = {}) {
  const stats = await computeStats({ desde, hasta, fecha });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hospital Aguaray";
  workbook.created = new Date();

  // 1) Hoja obligatoria: pacientes del día
  const wsPacientes = addTableSheet(
    workbook,
    `Pacientes del día ${stats.rango.fecha}`,
    [
      { header: "DNI", key: "dni", width: 14 },
      { header: "Apellido", key: "apellido", width: 22 },
      { header: "Nombre", key: "nombre", width: 22 },
      { header: "Nacionalidad", key: "nacionalidad", width: 18 },
      { header: "Teléfono", key: "telefono", width: 18 },
      { header: "Fecha de nacimiento", key: "fechaNacimiento", width: 20 },
      { header: "Doctor", key: "doctor", width: 26 },
      { header: "Especialidad", key: "especialidad", width: 22 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Dirección", key: "direccion", width: 30 },
    ],
    stats.pacientesDelDia,
  );
  wsPacientes.autoFilter = {
    from: "A1",
    to: `${wsPacientes.getColumn(wsPacientes.columnCount).letter}1`,
  };

  const resumen = [
    { metrica: "Rango desde", valor: stats.rango.desde },
    { metrica: "Rango hasta", valor: stats.rango.hasta },
    { metrica: "Total de turnos", valor: stats.resumen.totalTurnos },
    { metrica: "Turnos pendientes", valor: stats.resumen.pendientes },
    { metrica: "Turnos confirmados", valor: stats.resumen.confirmados },
    { metrica: "Turnos cancelados", valor: stats.resumen.cancelados },
    { metrica: "Tasa de confirmación (%)", valor: stats.resumen.tasaConfirmacion },
    { metrica: "Tasa de cancelación (%)", valor: stats.resumen.tasaCancelacion },
    { metrica: "Pacientes registrados (con cuenta)", valor: stats.resumen.pacientesRegistrados },
    { metrica: "Pacientes presenciales", valor: stats.resumen.pacientesPresenciales },
    { metrica: "Pacientes extranjeros (sin domicilio en Argentina)", valor: stats.resumen.extranjeros },
    { metrica: "Doctores disponibles (día)", valor: stats.resumen.doctoresDisponibles },
    { metrica: "Doctores no disponibles (día)", valor: stats.resumen.doctoresNoDisponibles },
    { metrica: "Especialidades distintas", valor: stats.resumen.especialidades },
  ];

  addTableSheet(
    workbook,
    "Resumen general",
    [
      { header: "Métrica", key: "metrica", width: 42 },
      { header: "Valor", key: "valor", width: 16 },
    ],
    resumen,
  );

  addTableSheet(
    workbook,
    "Turnos por día",
    [
      { header: "Fecha", key: "date", width: 14 },
      { header: "Total", key: "total", width: 10 },
      { header: "Pendientes", key: "pendientes", width: 12 },
      { header: "Confirmados", key: "confirmados", width: 12 },
      { header: "Cancelados", key: "cancelados", width: 12 },
    ],
    stats.turnosPorDia,
  );

  addTableSheet(
    workbook,
    "Turnos por doctor",
    [
      { header: "Doctor", key: "doctor", width: 28 },
      { header: "Especialidad", key: "specialty", width: 22 },
      { header: "Total", key: "total", width: 10 },
      { header: "Pendientes", key: "pendientes", width: 12 },
      { header: "Confirmados", key: "confirmados", width: 12 },
      { header: "Cancelados", key: "cancelados", width: 12 },
    ],
    stats.turnosPorDoctor,
  );

  addTableSheet(
    workbook,
    "Turnos por especialidad",
    [
      { header: "Especialidad", key: "specialty", width: 24 },
      { header: "Total", key: "total", width: 10 },
      { header: "Pendientes", key: "pendientes", width: 12 },
      { header: "Confirmados", key: "confirmados", width: 12 },
      { header: "Cancelados", key: "cancelados", width: 12 },
    ],
    stats.turnosPorEspecialidad,
  );

  addTableSheet(
    workbook,
    "Ocupación por doctor",
    [
      { header: "Doctor", key: "doctor", width: 28 },
      { header: "Especialidad", key: "especialidad", width: 22 },
      { header: "Cupos habilitados", key: "cupos", width: 18 },
      { header: "Turnos reservados", key: "turnos", width: 18 },
      { header: "Ocupación (%)", key: "ocupacion", width: 14 },
    ],
    stats.ocupacionPorDoctor,
  );

  addTableSheet(
    workbook,
    "Pacientes por nacionalidad",
    [
      { header: "Nacionalidad", key: "nacionalidad", width: 24 },
      { header: "Cantidad", key: "total", width: 12 },
    ],
    stats.pacientesPorNacionalidad,
  );

  addTableSheet(
    workbook,
    "Pacientes por edad",
    [
      { header: "Rango de edad", key: "rango", width: 18 },
      { header: "Cantidad", key: "total", width: 12 },
    ],
    stats.pacientesPorEdad,
  );

  addTableSheet(
    workbook,
    "Pacientes por provincia",
    [
      { header: "Provincia", key: "provincia", width: 24 },
      { header: "Cantidad", key: "total", width: 12 },
    ],
    stats.pacientesPorProvincia,
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename: `estadisticas_${stats.rango.fecha}.xlsx` };
}

export default function statsController() {
  return {
    getDashboard: async (query) => computeStats(query),
    exportExcel: async (query) => exportExcel(query),
  };
}
