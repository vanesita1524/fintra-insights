import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function App() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bugComment, setBugComment] = useState("");
  const [bugReport, setBugReport] = useState(null);
  const [bugLoading, setBugLoading] = useState(false);
  const [bugError, setBugError] = useState("");

  const [problematicaSeleccionada, setProblematicaSeleccionada] = useState(null);
  const [detalleProblematica, setDetalleProblematica] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error("No se pudieron obtener los datos");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los datos del dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const generarBugReport = async () => {
    if (!bugComment.trim()) {
      return;
    }

    setBugLoading(true);
    setBugError("");
    setBugReport(null);

    try {
      const response = await fetch(
        "https://tests.app.n8n.cloud/webhook/fintra-bug-report",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comentario: bugComment.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `El servidor respondió con estado ${response.status}`
        );
      }

      const resultado = await response.json();

      setBugReport(resultado);
    } catch (error) {
      console.error("Error generando Bug Report:", error);

      setBugError(
        "No fue posible generar el reporte. Intenta nuevamente."
      );
    } finally {
      setBugLoading(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  const abrirProblematica = async (id) => {
  try {
    setCargandoDetalle(true);

    const response = await fetch(`/api/problematicas/${id}`);

    if (!response.ok) {
      throw new Error("No fue posible obtener la problemática");
    }

    const resultado = await response.json();

    setDetalleProblematica(resultado);
    setProblematicaSeleccionada(id);
  } catch (error) {
    console.error(error);
  } finally {
    setCargandoDetalle(false);
  }
};
const resolverProblematica = async (id) => {
  try {
    const response = await fetch(
      `/api/problematicas/${id}/resolver`,
      {
        method: "PATCH",
      }
    );

    const resultado = await response.json();

    if (!response.ok) {
      throw new Error(
        resultado.error || "No fue posible resolver la problemática"
      );
    }

    setMostrarConfirmacion(false);
    setDetalleProblematica(null);
    setProblematicaSeleccionada(null);

    await cargarDashboard();

  } catch (error) {
    console.error("Error al resolver problemática:", error);

    window.alert(
      "No fue posible marcar la problemática como resuelta."
    );
  }
};
  const kpis = data?.kpis;

  const severityData = data?.severidades || [];
  const categoryData = data?.categorias || [];
  const countryData = data?.paises || [];

  const topProblematicas = (data?.problematicas || []).slice(0, 8);

// ==========================================
// CÁLCULO DE PRIORIDAD
// ==========================================

const severidadValor = {
  Alta: 3,
  Media: 2,
  Baja: 1,
};

const impactoValor = {
  Alto: 3,
  Medio: 2,
  Bajo: 1,
};

const problematicasPriorizadas = [...(data?.problematicas || [])]
  .map((problematica) => ({
    ...problematica,
    severidadScore:
      severidadValor[problematica.severidad] || 1,
    impactoScore:
      Number(problematica.impacto_nivel) || 1,
  }))
  .map((problematica, _, problematicas) => {
    const maxReportes = Math.max(
      ...problematicas.map(
        (p) => Number(p.reportes) || 0
      )
    );

    const frecuenciaScore =
      maxReportes > 0
        ? Number(problematica.reportes) / maxReportes
        : 0;

    const puntaje =
      frecuenciaScore * 0.40 +
      (problematica.severidadScore / 3) * 0.35 +
      (problematica.impactoScore / 3) * 0.25;

    return {
      ...problematica,
      puntajePrioridad: puntaje,
      prioridadPorcentaje: Math.round(puntaje * 100),
      impacto:
        problematica.impactoScore === 3
          ? "Alto"
          : problematica.impactoScore === 2
          ? "Medio"
          : "Bajo",
    };
  })
  .sort((a, b) => {
    if (
      b.puntajePrioridad !==
      a.puntajePrioridad
    ) {
      return (
        b.puntajePrioridad -
        a.puntajePrioridad
      );
    }

    if (
      Number(b.reportes) !==
      Number(a.reportes)
    ) {
      return (
        Number(b.reportes) -
        Number(a.reportes)
      );
    }

    if (
      b.severidadScore !==
      a.severidadScore
    ) {
      return (
        b.severidadScore -
        a.severidadScore
      );
    }

    if (b.impactoScore !== a.impactoScore) {
      return b.impactoScore - a.impactoScore;
    }

    // Último desempate: ID menor primero
    return Number(a.id) - Number(b.id);
      })
  .slice(0, 3);

  return (
    <div className="app">
      {/* ==========================================
          SIDEBAR
      ========================================== */}

      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">F</div>

          <div>
            <h2>Fintra</h2>
            <span>Insights</span>
          </div>
        </div>

        <nav>
          <button
            className={
              activeSection === "dashboard" ? "active" : ""
            }
            onClick={() => setActiveSection("dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            className={
              activeSection === "problematicas"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveSection("problematicas")
            }
          >
            <span>◈</span>
            Problemáticas
          </button>

          <button
            className={
              activeSection === "bug" ? "active" : ""
            }
            onClick={() => setActiveSection("bug")}
          >
            <span>⚙</span>
            Bug Report IA
          </button>
        </nav>

        <div className="sidebar-footer">
          <span>AI Product Insights</span>
          <small>Feedback inteligente</small>
        </div>
      </aside>

      {/* ==========================================
          CONTENIDO PRINCIPAL
      ========================================== */}

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Fintra Insights</h1>
            <p>
              Análisis inteligente del feedback de usuarios
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={cargarDashboard}
          >
            ↻ Actualizar datos
          </button>
        </header>

        {/* ==========================================
            ESTADO DE CARGA
        ========================================== */}

        {loading && (
          <div className="content-card">
            <div className="empty-chart">
              <div className="empty-icon">↻</div>

              <h3>Cargando datos...</h3>

              <p>
                Estamos obteniendo la información más
                reciente del sistema.
              </p>
            </div>
          </div>
        )}

        {/* ==========================================
            ESTADO DE ERROR
        ========================================== */}

        {!loading && error && (
          <div className="content-card">
            <div className="empty-chart">
              <div className="empty-icon">!</div>

              <h3>No pudimos cargar el dashboard</h3>

              <p>{error}</p>

              <button
                className="refresh-button"
                onClick={cargarDashboard}
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            DASHBOARD
        ========================================== */}

        {!loading &&
          !error &&
          data &&
          activeSection === "dashboard" && (
            <section>
              {/* INTRODUCCIÓN */}

              <div className="welcome">
                <div>
                  <span className="eyebrow">
                    VISIÓN GENERAL
                  </span>

                  <h2>
                    Conoce lo que tus usuarios necesitan
                  </h2>

                  <p>
                    Convierte el feedback de usuarios en
                    información útil para priorizar mejoras
                    del producto.
                  </p>
                </div>
              </div>

              {/* ==========================================
                  KPIs
              ========================================== */}

              <div className="kpi-grid">
                <div className="kpi-card">
                  <span>Total comentarios</span>

                  <strong>
                    {kpis.total_comentarios}
                  </strong>

                  <small>
                    Comentarios analizados
                  </small>
                </div>

                <div className="kpi-card">
                  <span>Problemáticas</span>

                  <strong>
                    {kpis.total_problematicas}
                  </strong>

                  <small>
                    Problemas identificados
                  </small>
                </div>

                <div className="kpi-card">
                  <span>Alta severidad</span>

                  <strong>
                    {kpis.alta_severidad}
                  </strong>

                  <small>
                    Requieren atención
                  </small>
                </div>

                <div className="kpi-card">
                  <span>Calificación promedio</span>

                  <strong>
                    {Number(
                      kpis.promedio_calificacion
                    ).toFixed(1)}
                  </strong>

                  <small>
                    Sobre 5.0
                  </small>
                </div>
              </div>

              {/* ==========================================
                  GRÁFICOS
              ========================================== */}

              <div className="charts-grid">
                {/* TOP PROBLEMÁTICAS */}

                <div className="content-card chart-card large">
                  <div className="card-header">
                    <div>
                      <span className="eyebrow">
                        PROBLEMÁTICAS
                      </span>

                      <h3>
                        Principales problemáticas
                      </h3>
                    </div>

                    <span className="badge">
                      {kpis.total_problematicas}{" "}
                      identificadas
                    </span>
                  </div>

                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >
                    <BarChart
                      data={topProblematicas}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 20,
                        left: 20,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        allowDecimals={false}
                      />

                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={190}
                        tick={{ fontSize: 11 }}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="reportes"
                        name="Reportes"
                        fill="#00BFA5"
                        radius={[0, 5, 5, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* SEVERIDAD */}

                <div className="content-card chart-card">
                  <div className="card-header">
                    <div>
                      <span className="eyebrow">
                        SEVERIDAD
                      </span>

                      <h3>Distribución</h3>
                    </div>
                  </div>

                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >
                    <PieChart>
                      <Pie
                        data={severityData}
                        dataKey="cantidad"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {severityData.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                index === 0
                                  ? "#00BFA5"
                                  : "#B8E8E1"
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* CATEGORÍAS */}

                <div className="content-card chart-card">
                  <div className="card-header">
                    <div>
                      <span className="eyebrow">
                        CATEGORÍAS
                      </span>

                      <h3>
                        Feedback por categoría
                      </h3>
                    </div>
                  </div>

                  <ResponsiveContainer
                    width="100%"
                    height={280}
                  >
                    <BarChart
                      data={categoryData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 30,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="nombre"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        height={70}
                        tick={{ fontSize: 11 }}
                      />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Bar
                        dataKey="cantidad"
                        name="Comentarios"
                        fill="#009688"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* PAÍSES */}

                <div className="content-card chart-card">
                  <div className="card-header">
                    <div>
                      <span className="eyebrow">
                        PAÍSES
                      </span>

                      <h3>
                        Comentarios por país
                      </h3>
                    </div>
                  </div>

                  <ResponsiveContainer
                    width="100%"
                    height={280}
                  >
                    <BarChart
                      data={countryData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis dataKey="nombre" />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Bar
                        dataKey="cantidad"
                        name="Comentarios"
                        fill="#00BFA5"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ==========================================
                  TABLA DE PRIORIZACIÓN
              ========================================== */}

              <div className="content-card priority-card">
                <div className="card-header">
                  <div>
                    <span className="eyebrow">
                      PRIORIZACIÓN
                    </span>

                    <h3>
                      Problemáticas para atención
                    </h3>

                    <p className="card-description">
                      Priorización basada en frecuencia y
                      severidad del feedback recibido.
                    </p>
                  </div>

                  <span className="badge">
                    {problematicasPriorizadas.length}{" "}
                    problemáticas
                  </span>
                </div>

                <div className="priority-table-wrapper">
                  <table className="priority-table">
                    <thead>
                      <tr>
                        <th>Problemática</th>
                        <th>Reportes</th>
                        <th>% feedback</th>
                        <th>Severidad</th>
                        <th>Impacto</th>
                        <th>Prioridad</th>
                      </tr>
                    </thead>

                    <tbody>
                      {problematicasPriorizadas.map(
                        (problematica) => (
                          <tr
                            key={problematica.id}
                          >
                            <td>
                              <strong>
                                {problematica.nombre}
                              </strong>
                            </td>

                            <td>
                              {problematica.reportes}
                            </td>

                            <td>
                              {problematica.porcentaje}%
                            </td>

                            <td>
                              <span
                                className={`severity-badge severity-${problematica.severidad
                                  .toLowerCase()
                                  .replace(" ", "-")}`}
                              >
                                {problematica.severidad}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`severity-badge severity-${problematica.impacto.toLowerCase()}`}
                              >
                                {problematica.impacto}
                              </span>
                            </td>

                            <td>
                              <span className="priority-badge">
                                {problematica.prioridadPorcentaje}%
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

        {/* ==========================================
            PROBLEMÁTICAS
        ========================================== */}

        {!loading &&
          !error &&
          data &&
          activeSection === "problematicas" && (
            <section className="content-card">
              <span className="eyebrow">
                ANÁLISIS
              </span>

              <h2>Problemáticas</h2>

              <p>
                Se encontraron{" "}
                {data.problematicas.length}{" "}
                problemáticas identificadas a partir
                de los comentarios.
              </p>

              <div className="problematicas-list">
                {data.problematicas.map(
                  (problematica) => (
                    <div
                        key={problematica.id}
                        className="problematica-item"
                        onClick={() => abrirProblematica(problematica.id)}
                      >
                      <div>
                        <strong>
                          {problematica.nombre}
                        </strong>

                        <small>
                          {problematica.reportes}{" "}
                          {problematica.reportes === 1
                            ? "reporte"
                            : "reportes"}
                        </small>
                      </div>

                      <span className="badge">
                        {problematica.severidad}
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

        {/* ==========================================
            BUG REPORT IA
        ========================================== */}

        {!loading &&
          !error &&
          data &&
          activeSection === "bug" && (
            <section className="content-card">

              <span className="eyebrow">
                INTELIGENCIA ARTIFICIAL
              </span>

              <h2>Bug Report IA</h2>

              <p>
                Introduce un comentario de usuario y genera
                automáticamente un reporte estructurado para soporte
                y desarrollo.
              </p>

              <div className="bug-form">

                <label htmlFor="bug-comment">
                  Comentario del usuario
                </label>

                <textarea
                  id="bug-comment"
                  placeholder="Ejemplo: No puedo enviar la factura por WhatsApp y mis clientes no revisan el correo."
                  value={bugComment}
                  onChange={(e) => setBugComment(e.target.value)}
                  rows={6}
                />

                <button
                  className="primary-button"
                  onClick={generarBugReport}
                  disabled={bugLoading || !bugComment.trim()}
                >
                  {bugLoading
                    ? "Generando reporte..."
                    : "Generar reporte"}
                </button>

                {bugError && (
                  <div className="bug-error">
                    {bugError}
                  </div>
                )}

              </div>

              {bugReport && (
                <div className="bug-report-result">

                  <div className="bug-report-header">
                    <div>
                      <span className="eyebrow">
                        REPORTE GENERADO POR IA
                      </span>

                      <h3>{bugReport.titulo}</h3>
                    </div>

                    <span
                      className={`severity-badge severity-${bugReport.severidad?.toLowerCase()}`}
                    >
                      {bugReport.severidad}
                    </span>
                  </div>

                  <div className="bug-report-section">
                    <h4>Entorno confirmado</h4>

                    {bugReport.entorno?.confirmado?.length > 0 ? (
                      <ul>
                        {bugReport.entorno.confirmado.map(
                          (item, index) => (
                            <li key={index}>{item}</li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p>No se identificó información.</p>
                    )}
                  </div>

                  <div className="bug-report-section">
                    <h4>Por confirmar</h4>

                    {bugReport.entorno?.por_confirmar?.length > 0 ? (
                      <ul>
                        {bugReport.entorno.por_confirmar.map(
                          (item, index) => (
                            <li key={index}>{item}</li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p>No hay información pendiente.</p>
                    )}
                  </div>

                  <div className="bug-report-section">
                    <h4>Pasos para reproducir</h4>

                    {bugReport.pasos_reproducir?.length > 0 ? (
                      <ol>
                        {bugReport.pasos_reproducir.map(
                          (paso, index) => (
                            <li key={index}>{paso}</li>
                          )
                        )}
                      </ol>
                    ) : (
                      <p>
                        No hay pasos suficientes en el comentario.
                      </p>
                    )}
                  </div>

                  <div className="bug-report-grid">

                    <div className="bug-report-section">
                      <h4>Resultado esperado</h4>
                      <p>
                        {bugReport.resultado_esperado}
                      </p>
                    </div>

                    <div className="bug-report-section">
                      <h4>Resultado actual</h4>
                      <p>
                        {bugReport.resultado_actual}
                      </p>
                    </div>

                    <div className="bug-report-section">
                      <h4>País</h4>
                      <p>
                        {bugReport.pais}
                      </p>
                    </div>

                    <div className="bug-report-section">
                      <h4>A quién afecta</h4>
                      <p>
                        {bugReport.a_quien_afecta}
                      </p>
                    </div>

                  </div>

                  <div className="bug-report-section">
                    <h4>Razón de severidad</h4>

                    <p>
                      {bugReport.razon_severidad}
                    </p>
                  </div>

                  <div className="bug-report-section">
                    <h4>Preguntas para soporte</h4>

                    {bugReport.preguntas_soporte?.length > 0 ? (
                      <ul>
                        {bugReport.preguntas_soporte.map(
                          (pregunta, index) => (
                            <li key={index}>
                              {pregunta}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p>
                        No se identificaron preguntas adicionales.
                      </p>
                    )}
                  </div>

                </div>
              )}

            </section>
          )}
      </main>

      {detalleProblematica && (
        <div className="detail-overlay">
          <div className="detail-panel">

            <div className="detail-header">
              <div>
                <span className="eyebrow">
                  DETALLE DE PROBLEMÁTICA
                </span>

                <h2>
                  {detalleProblematica.problematica.nombre}
                </h2>
              </div>

              <button
                className="detail-close"
                onClick={() => {
                  setDetalleProblematica(null);
                  setProblematicaSeleccionada(null);
                }}
              >
                ×
              </button>
            </div>

            {cargandoDetalle ? (
              <div className="detail-loading">
                Cargando información...
              </div>
            ) : (
              <>
                <div className="detail-stats">

                  <div className="detail-stat">
                    <span>Reportes</span>
                    <strong>
                      {detalleProblematica.problematica.reportes}
                    </strong>
                  </div>

                  <div className="detail-stat">
                    <span>Participación</span>
                    <strong>
                      {detalleProblematica.problematica.porcentaje}%
                    </strong>
                  </div>

                  <div className="detail-stat">
                    <span>Severidad</span>
                    <strong>
                      {detalleProblematica.problematica.severidad}
                    </strong>
                  </div>

                </div>

                <button
                  className="resolve-button"
                  onClick={() => setMostrarConfirmacion(true)}
                >
                  ✓ Marcar como resuelta
                </button>

                <div className="detail-section">
                  <h3>Impacto</h3>

                  <p>
                    {detalleProblematica.problematica.impacto ||
                      "No se identificó información de impacto."}
                  </p>
                </div>

                <div className="detail-section">
                  <h3>Información faltante</h3>

                  <p>
                    {detalleProblematica.problematica.informacion_faltante ||
                      "No se identificó información faltante."}
                  </p>
                </div>

                <div className="detail-section">
                  <h3>Comentarios relacionados</h3>

                  <div className="detail-comments">

                    {detalleProblematica.comentarios.map(
                      (comentario) => (
                        <div
                          key={comentario.id}
                          className="detail-comment"
                        >
                          <div className="comment-meta">
                            <span>
                              {comentario.pais}
                            </span>

                            <span>
                              Calificación:{" "}
                              {comentario.calificacion}/5
                            </span>
                          </div>

                          <p>
                            {comentario.comentario}
                          </p>
                        </div>
                      )
                    )}

                  </div>
                </div>
              </>
            )}

                      {mostrarConfirmacion && (
              <div className="confirm-overlay">
                <div className="confirm-modal">
                  <div className="confirm-icon">✓</div>

                  <h3>¿Marcar como resuelta?</h3>

                  <p>
                    Esta problemática dejará de aparecer entre las
                    problemáticas activas y ya no participará en la
                    priorización.
                  </p>

                  <div className="confirm-actions">
                    <button
                      className="confirm-cancel"
                      onClick={() => setMostrarConfirmacion(false)}
                    >
                      Cancelar
                    </button>

                    <button
                      className="confirm-resolve"
                      onClick={() =>
                        resolverProblematica(
                          detalleProblematica.problematica.id
                        )
                      }
                    >
                      Sí, marcar como resuelta
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}


export default App;