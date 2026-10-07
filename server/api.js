import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/api/dashboard", async (req, res) => {
  try {
    // =========================
    // KPIs PRINCIPALES
    // =========================

    const [kpis] = await pool.query(`
      SELECT
        COUNT(*) AS total_comentarios,

        ROUND(AVG(calificacion), 2) AS promedio_calificacion,

        COUNT(
          DISTINCT CASE
            WHEN p.resuelta = FALSE THEN cl.problematica_id
          END
        ) AS total_problematicas,

        COUNT(
          CASE
            WHEN p.resuelta = FALSE
            AND cl.severidad = 'Alta'
            THEN 1
          END
        ) AS alta_severidad

      FROM comentarios c

      LEFT JOIN clasificaciones cl
        ON c.id = cl.comentario_id

      LEFT JOIN problematicas p
        ON cl.problematica_id = p.id
    `);
    // =========================
    // PROBLEMÁTICAS
    // =========================

    const [problematicas] = await pool.query(`
      SELECT 
        p.id, 
        p.nombre,

        COUNT(cl.id) AS reportes,

        ROUND(
          COUNT(cl.id) * 100.0 /
          (SELECT COUNT(*) FROM clasificaciones),
          1
        ) AS porcentaje,

        CASE 
          WHEN MAX(
            CASE 
              WHEN cl.severidad = 'Alta' THEN 3
              WHEN cl.severidad = 'Media' THEN 2
              WHEN cl.severidad = 'Baja' THEN 1
              ELSE 0
            END
          ) = 3 THEN 'Alta'

          WHEN MAX(
            CASE 
              WHEN cl.severidad = 'Alta' THEN 3
              WHEN cl.severidad = 'Media' THEN 2
              WHEN cl.severidad = 'Baja' THEN 1
              ELSE 0
            END
          ) = 2 THEN 'Media'

          ELSE 'Baja'
        END AS severidad,

        MAX(cl.impacto_nivel) AS impacto_nivel,

        CASE
          WHEN MAX(cl.impacto_nivel) = 3 THEN 'Alto'
          WHEN MAX(cl.impacto_nivel) = 2 THEN 'Medio'
          ELSE 'Bajo'
        END AS impacto,

        GROUP_CONCAT(
          DISTINCT cl.impacto
          SEPARATOR ' | '
        ) AS impacto_descripcion,

        p.resuelta,
        p.fecha_resolucion

      FROM problematicas p

      INNER JOIN clasificaciones cl
        ON p.id = cl.problematica_id

      WHERE p.resuelta = FALSE

      GROUP BY 
        p.id,
        p.nombre,
        p.resuelta,
        p.fecha_resolucion

      ORDER BY 
        reportes DESC,
        p.nombre ASC
      `);

    // =========================
    // SEVERIDADES
    // =========================

    const [severidades] = await pool.query(`
      SELECT
        cl.severidad AS nombre,
        COUNT(*) AS cantidad
      FROM clasificaciones cl
      INNER JOIN problematicas p
        ON cl.problematica_id = p.id
      WHERE p.resuelta = FALSE
      GROUP BY cl.severidad
      ORDER BY cantidad DESC
    `);
    // =========================
    // CATEGORÍAS
    // =========================

    const [categorias] = await pool.query(`
      SELECT
        categoria AS nombre,
        COUNT(*) AS cantidad
      FROM clasificaciones
      GROUP BY categoria
      ORDER BY cantidad DESC
    `);

    // =========================
    // PAÍSES
    // =========================

    const [paises] = await pool.query(`
      SELECT
        pais AS nombre,
        COUNT(*) AS cantidad
      FROM comentarios
      GROUP BY pais
      ORDER BY cantidad DESC
    `);

    // =========================
    // RESPUESTA
    // =========================

    res.json({
      kpis: kpis[0],
      problematicas,
      severidades,
      categorias,
      paises,
    });

  } catch (error) {
    console.error("Error en /api/dashboard:", error);

    res.status(500).json({
      error: "No fue posible obtener los datos del dashboard",
      detalle: error.message,
    });
  }
});

app.get("/api/problematicas/:id", async (req, res) => {
  try {
    const problematicaId = Number(req.params.id);

    if (!problematicaId) {
      return res.status(400).json({
        error: "ID de problemática inválido",
      });
    }

    const [problematicas] = await pool.query(
      `
      SELECT
        p.id,
        p.nombre,
        COUNT(cl.id) AS reportes,
        ROUND(
          COUNT(cl.id) * 100.0 /
          (SELECT COUNT(*) FROM clasificaciones),
          1
        ) AS porcentaje,
        CASE
          WHEN SUM(
            CASE
              WHEN cl.severidad = 'Alta' THEN 1
              ELSE 0
            END
          ) >= SUM(
            CASE
              WHEN cl.severidad = 'Media' THEN 1
              ELSE 0
            END
          )
          THEN 'Alta'
          ELSE 'Media'
        END AS severidad,
        GROUP_CONCAT(
          DISTINCT cl.impacto
          SEPARATOR ' | '
        ) AS impacto,
        GROUP_CONCAT(
          DISTINCT cl.informacion_faltante
          SEPARATOR ' | '
        ) AS informacion_faltante
      FROM problematicas p
      INNER JOIN clasificaciones cl
        ON p.id = cl.problematica_id
      WHERE p.id = ?
      GROUP BY p.id, p.nombre
      `,
      [problematicaId]
    );

    if (problematicas.length === 0) {
      return res.status(404).json({
        error: "Problemática no encontrada",
      });
    }

    const [comentarios] = await pool.query(
      `
      SELECT
        c.id,
        c.pais,
        c.calificacion,
        c.comentario,
        cl.tipo_problema,
        cl.severidad,
        cl.categoria
      FROM comentarios c
      INNER JOIN clasificaciones cl
        ON c.id = cl.comentario_id
      WHERE cl.problematica_id = ?
      ORDER BY c.id ASC
      `,
      [problematicaId]
    );

    res.json({
      problematica: problematicas[0],
      comentarios,
    });
  } catch (error) {
    console.error("Error en /api/problematicas/:id:", error);

    res.status(500).json({
      error: "No fue posible obtener la problemática",
      detalle: error.message,
    });
  }
});

app.patch("/api/problematicas/:id/resolver", async (req, res) => {
  try {
    const problematicaId = Number(req.params.id);

    if (!problematicaId) {
      return res.status(400).json({
        error: "ID de problemática inválido",
      });
    }

    const [resultado] = await pool.query(
      `
      UPDATE problematicas
      SET
        resuelta = TRUE,
        fecha_resolucion = NOW()
      WHERE id = ?
        AND resuelta = FALSE
      `,
      [problematicaId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        error: "La problemática no existe o ya está resuelta",
      });
    }

    res.json({
      mensaje: "Problemática marcada como resuelta",
      id: problematicaId,
    });

  } catch (error) {
    console.error(
      "Error al resolver problemática:",
      error
    );

    res.status(500).json({
      error: "No fue posible marcar la problemática como resuelta",
      detalle: error.message,
    });
  }
});

const distPath = path.join(__dirname, "..", "dist");

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile("index.html", {
    root: distPath,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API ejecutándose en http://localhost:${PORT}`);
});