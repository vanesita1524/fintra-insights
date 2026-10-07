# Fintra Insights

Fintra Insights es un dashboard web para analizar comentarios de usuarios y dar seguimiento a las problemáticas detectadas. Presenta indicadores, distribuciones y listados priorizados para ayudar a entender la frecuencia, severidad e impacto de los problemas y facilitar su resolución.

## Funcionalidades

- Resumen de comentarios, calificación promedio, problemáticas abiertas y casos de severidad alta.
- Gráficos y agrupaciones por severidad, categoría y país.
- Listado de problemáticas abiertas con reportes, nivel de severidad e impacto.
- Cálculo de prioridad en el frontend que combina frecuencia de reportes (40 %), severidad (35 %) e impacto (25 %); muestra las tres problemáticas con mayor puntaje.
- Vista de detalle de una problemática y de los comentarios relacionados.
- Acción para marcar una problemática como resuelta.
- Formulario para enviar un reporte de error a un webhook externo de n8n.

## Tecnologías

| Tecnología | Uso |
| --- | --- |
| React 19 | Construcción de la interfaz como aplicación de página única (SPA). |
| Vite | Servidor de desarrollo, recarga rápida y compilación del frontend. |
| Recharts | Gráficos del dashboard. |
| Node.js y Express 5 | API HTTP y servicio de los archivos compilados en producción. |
| MySQL2 | Cliente MySQL con API de promesas para consultar TiDB. |
| TiDB | Base de datos compatible con el protocolo y las consultas de MySQL. |
| dotenv | Carga de la configuración local desde variables de entorno. |
| ESLint | Análisis estático y revisión de estilo del código. |

## Arquitectura y diseño

El frontend en React solicita datos a la API de Express mediante rutas `/api`. El servidor consulta TiDB, prepara los datos agregados y devuelve JSON; React muestra los resultados en tarjetas, tablas y gráficos. Durante el desarrollo, Vite reenvía las solicitudes `/api` al backend local. En producción, Express sirve tanto la API como los archivos compilados del frontend.

La interfaz tiene una navegación lateral y un área principal con indicadores, gráficos y problemáticas. Los estilos se encuentran en `src/index.css` y usan tarjetas, bordes suaves y una paleta clara con acentos verde azulado.

## Estructura del proyecto

```text
.
├── public/                 # Recursos estáticos servidos directamente
├── server/
│   ├── api.js              # API REST y servidor de producción
│   ├── db.js               # Pool de conexiones a TiDB
│   └── test-db.js          # Prueba puntual de conexión a la base de datos
├── src/
│   ├── assets/             # Imágenes y recursos importados por la interfaz
│   ├── App.jsx             # Dashboard, estado de interfaz y llamadas a la API
│   ├── index.css           # Estilos y diseño responsive
│   └── main.jsx            # Punto de entrada que monta React
├── index.html              # Documento HTML de entrada de Vite
├── vite.config.js          # Plugin de React y proxy de desarrollo para /api
├── eslint.config.js        # Configuración de ESLint
└── package.json            # Dependencias y comandos npm
```

## Requisitos

- Node.js y npm.
- Acceso a una instancia TiDB/MySQL con las tablas y columnas consultadas por la API.
- Credenciales de base de datos para configurar las variables de entorno.

## Configuración local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto con la configuración de la base de datos:

   ```dotenv
   TIDB_HOST=tu-host
   TIDB_PORT=4000
   TIDB_USER=tu-usuario
   TIDB_PASSWORD=tu-contrasena
   TIDB_DATABASE=tu-base-de-datos
   PORT=3001
   ```

   `PORT` es opcional y, si no se define, el backend usa `3001`. No compartas ni subas el archivo `.env` al repositorio.

3. Para desarrollar, inicia el backend y el frontend en terminales separadas:

   ```bash
   npm run start
   ```

   ```bash
   npm run dev
   ```

   Abre la URL local que muestre Vite en la terminal. El frontend enviará `/api` al backend en `http://localhost:3001`.

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite en modo desarrollo con recarga rápida. El backend debe ejecutarse aparte con `npm run start`. |
| `npm run build` | Compila el frontend optimizado para producción y genera los archivos en `dist/`. |
| `npm run start` | Ejecuta el servidor Express en `server/api.js`. Sirve la API y los archivos de `dist/`; para producción, ejecuta primero `npm run build`. |
| `npm run preview` | Inicia el servidor de previsualización de Vite para revisar el build localmente. No sustituye al backend Express ni conecta por sí mismo la API. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |

Para probar que las credenciales permiten conectarse a la base de datos:

```bash
node server/test-db.js
```

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/dashboard` | Devuelve los KPIs, las problemáticas abiertas y los agregados por severidad, categoría y país. |
| `GET` | `/api/problematicas/:id` | Devuelve el detalle de una problemática y los comentarios asociados. |
| `PATCH` | `/api/problematicas/:id/resolver` | Marca como resuelta una problemática abierta y registra la fecha de resolución. |

La API consulta las tablas `comentarios`, `clasificaciones` y `problematicas`. Los nombres de campos y las agregaciones requeridas se pueden revisar en `server/api.js`.

## Reporte de errores

El formulario del frontend envía el comentario a un webhook de n8n configurado directamente en `src/App.jsx`. Para cambiar el destino o administrar su configuración por entorno, actualiza esa integración antes de desplegar. El webhook no forma parte de la API local.

## Notas

- La conexión a la base de datos requiere TLS con validación del certificado.
- El backend consulta TiDB al solicitar datos; no utiliza datos de ejemplo locales.
- En producción, despliega el backend Node.js junto con el directorio generado `dist/` y configura las variables de entorno en el entorno de ejecución.
