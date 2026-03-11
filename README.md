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

## 🧪 CI/CD y Calidad

El proyecto incluye un pipeline automatizado en **GitHub Actions** (`deploy.yml`):
- **Tests Unitarios:** Ejecución automática de `pytest` en cada push a `main` y `prod`.
- **Docker Build:** Validación de construcción de imágenes en `main`.
- **Auto-Deploy:** Despliegue automático a Homelab mediante el registro de contenedores (GHCR.io) al hacer push a la rama `prod`.

---

## 📝 Análisis de Calidad (Skills AI)
Se incluye un reporte detallado sobre futuras mejoras de escalabilidad y arquitectura basado en IA:
👉 [skill_analysis.md](./skill_analysis.md)

---
*Desarrollado con ❤️ para organizar las finanzas compartidas de forma simple.*
