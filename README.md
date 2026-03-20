# 💰 App de Gastos Compartidos

Una aplicación web moderna y eficiente diseñada para gestionar gastos entre convivientes o grupos, con soporte para proyectos privados, liquidaciones automáticas y un sistema interactivo de reacciones.

---

## 🚀 Características Principales

- **Gestión de Proyectos:** Crea proyectos para agrupar gastos (ej: "Viaje a la playa", "Compras del mes").
- **Modo Privado 🔒:** Los proyectos pueden marcarse como privados para que solo el creador los vea y gestione.
- **Liquidaciones Inteligentes:** Cálculo automático de deudas entre usuarios, distinguiendo entre gastos compartidos y préstamos directos.
- **Sistema de Reacciones ❤️:** Los usuarios pueden reaccionar con emojis a cada gasto para confirmar que lo han visto o están de acuerdo.
- **Categorización:** Organización de gastos por categorías (Despensa, Restaurantes, etc.).
- **Persistencia Robusta:** Historial completo con control de cierre de proyectos.

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13+)
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Migraciones:** [Alembic](https://alembic.sqlalchemy.org/)
- **Base de Datos:** [PostgreSQL](https://www.postgresql.org/)
- **Validación:** Pydantic v2
- **Testing:** Pytest (con base de datos SQLite en memoria para CI)

### Frontend
- **Framework:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Iconos:** Lucide React
- **Estilos:** Vanilla CSS (Moderno, Responsive)
- **Estado:** React Context API

---

## ⚙️ Configuración y Desarrollo

### Requisitos Previos
- Docker y Docker Compose
- Python 3.13 (opcional para desarrollo local sin Docker)
- Node.js (opcional para desarrollo local sin Docker)

### Ejecución Local con Docker (Recomendado)

1.  Clona el repositorio.
2.  Copia el archivo de ejemplo de variables de entorno:
    ```bash
    cp .env.example .env
    ```
3.  Inicia la aplicación:
    ```bash
    docker compose up --build
    ```
4.  La aplicación estará disponible en:
    - Frontend: `http://localhost:5173`
    - API (Backend): `http://localhost:8000`
    - Documentación API: `http://localhost:8000/docs`

### Migraciones de Base de Datos
El proyecto utiliza Alembic para gestionar el esquema. Las migraciones se aplican automáticamente al iniciar el contenedor del backend, pero puedes gestionarlas manualmente:
```bash
cd backend
alembic upgrade head
```

---

## 🚀 Despliegue en Producción (Homelab)

El proyecto está preparado para desplegarse mediante Docker y GitHub Actions.

### 1️⃣ Configuración Inicial
1. En tu servidor (Homelab), crea la carpeta de trabajo: `mkdir -p ~/gastos && cd ~/gastos`.
2. Descarga el `docker-compose.yml` del repositorio.
3. Crea un archivo `.env` basado en `.env.example` con tus credenciales reales y la `SECRET_KEY` generada (`openssl rand -hex 32`).
4. Si el repositorio es privado, inicia sesión en GHCR:
   ```bash
   echo "TU_GITHUB_TOKEN" | docker login ghcr.io -u TU_USUARIO --password-stdin
   ```

### 2️⃣ Primer Despliegue e Inicialización
```bash
docker compose pull
docker compose up -d
# Inicializar base de datos (solo la primera vez)
docker compose exec -T db psql -U user -d db < backend/sql/schema.sql
```

### 3️⃣ Flujo de Actualización (CI/CD)
El proyecto utiliza **GitHub Actions** para automatizar el despliegue:
1. **Push a `main`:** Ejecuta tests y valida la construcción de imágenes.
2. **Push a `prod`:** 
   - Ejecuta tests.
   - Construye y sube las imágenes a **GHCR.io**.
   - Para aplicar los cambios en el servidor:
     ```bash
     cd ~/gastos && docker compose pull && docker compose up -d
     ```
*Nota: Las migraciones de base de datos se aplican automáticamente al iniciar el contenedor del backend (`alembic upgrade head`).*

---

## 🛠️ Mantenimiento y Upgrades Manuales

Si necesitas realizar tareas de mantenimiento o forzar una actualización:

### Actualizar solo las imágenes
```bash
docker compose pull
docker compose up -d
```

### Gestión de Base de Datos (Alembic)
Si hay inconsistencias con las migraciones:
```bash
# Ver el estado actual de las migraciones
docker compose exec backend alembic current

# Aplicar manualmente la última versión
docker compose exec backend alembic upgrade head

# Marcar la base de datos como actualizada (si ya tienes las tablas creadas)
docker compose exec backend alembic stamp head
```

### Ver Logs del Sistema
```bash
docker compose logs -f          # Todos los servicios
docker compose logs -f backend  # Solo el backend
```

---

## 📝 Análisis de Calidad (Skills AI)
Se incluye un reporte detallado sobre futuras mejoras de escalabilidad y arquitectura basado en IA:
👉 [skill_analysis.md](./skill_analysis.md)

---
*Desarrollado con ❤️ para organizar las finanzas compartidas de forma simple.*
### Configuración de Nginx / Nginx Proxy Manager (SSE)
Si usas un proxy inverso, necesitas esta configuración para que el Sync en tiempo real (SSE) funcione:

#### Opción A: Pestaña "Advanced" (Recomendado)
Pega esto en la pestaña **Advanced** de tu Proxy Host:
```nginx
location /api/stream {
    proxy_pass http://frontend:80/api/stream;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 24h;
}
```

#### Opción B: Pestaña "Custom Locations" (Si no tienes pestaña Advanced)
1. Haz clic en **Add Location**.
2. Define: `/api/stream`, Scheme: `http`, Forward Host: `frontend`, Port: `80`.
3. Haz clic en el icono de engranaje (configuración) de esa fila y pega:
```nginx
proxy_set_header Connection '';
proxy_http_version 1.1;
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 24h;
```
