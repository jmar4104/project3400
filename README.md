# TaskBoard — Gestor de Tareas Estudiantiles

Una app web personal para organizar tus tareas académicas, con login, CRUD de tareas, cursos, vista de calendario y recordatorios.

## Estructura del proyecto

```
taskboard/
├── app.py           ← Flask app + todos los endpoints de tareas y cursos
├── auth.py          ← Rutas de register / login / logout
├── models.py        ← Modelos de SQLAlchemy (User, Task, Course)
├── requirements.txt ← Dependencias de Python
└── frontend/
    ├── index.html   ← Frontend principal (abrir en el browser)
    ├── app.js       ← Toda la lógica del frontend
    └── app.css      ← Estilos
```

## Cómo empezar

### 1. Instalar las dependencias de Python

```bash
pip install -r requirements.txt
```

### 2. Correr el backend

```bash
python app.py
```

El servidor corre en `http://localhost:5000`.  
La base de datos SQLite (`taskboard.db`) se crea sola la primera vez que corres la app, no tienes que hacer nada extra.

### 3. Abrir el frontend

Abre `frontend/index.html` directamente en el browser, o si quieres servirlo desde Flask, copia la carpeta `frontend/` a donde apunta `static_folder` en `app.py`.

### 4. Configurar un secret key (para producción)

```bash
export SECRET_KEY="pon-aqui-algo-aleatorio-y-seguro"
```

---

## Referencia de la API

### Auth

| Method | Endpoint              | Descripción              |
|--------|-----------------------|--------------------------|
| POST   | /api/auth/register    | Crear cuenta             |
| POST   | /api/auth/login       | Iniciar sesión           |
| POST   | /api/auth/logout      | Cerrar sesión            |
| GET    | /api/auth/me          | Ver usuario autenticado  |

**Body para register / login:**
```json
{ "name": "Juan", "email": "juan@ejemplo.com", "password": "clave123" }
```

---

### Tasks (Tareas)

| Method | Endpoint                   | Descripción                    |
|--------|----------------------------|--------------------------------|
| GET    | /api/tasks                 | Listar tareas (con filtros)    |
| POST   | /api/tasks                 | Crear tarea                    |
| GET    | /api/tasks/<id>            | Ver una tarea                  |
| PUT    | /api/tasks/<id>            | Editar tarea                   |
| PATCH  | /api/tasks/<id>/complete   | Marcar como completada         |
| DELETE | /api/tasks/<id>            | Eliminar tarea                 |
| GET    | /api/tasks/reminders/due   | Ver recordatorios pendientes   |

**Query params para GET /api/tasks:**
- `course_id` — filtrar por curso
- `status` — `Pending` o `Completed`
- `priority` — `High`, `Medium`, o `Low`
- `due_from` / `due_to` — rango de fechas (YYYY-MM-DD)

**Body para crear o editar tarea:**
```json
{
  "title": "Documento SRS",
  "description": "Requisitos funcionales y no funcionales",
  "due_date": "2026-05-15",
  "priority": "High",
  "course_id": 1,
  "reminder_at": "2026-05-14T09:00:00"
}
```

---

### Courses (Cursos)

| Method | Endpoint              | Descripción       |
|--------|-----------------------|-------------------|
| GET    | /api/courses          | Listar cursos     |
| POST   | /api/courses          | Crear curso       |
| PUT    | /api/courses/<id>     | Editar curso      |
| DELETE | /api/courses/<id>     | Eliminar curso    |

**Body para crear curso:**
```json
{ "name": "Ingeniería de Software", "color": "#1D9E75" }
```

---

## Alineación con la Rúbrica

| Sección de la rúbrica         | Cómo se cubre                                                  |
|-------------------------------|----------------------------------------------------------------|
| Análisis (SRS)                | RF01–RF06 implementados; RNF01–RNF05 contemplados             |
| Diseño (UML + Arquitectura)   | Arquitectura MVC; modelos alineados con el diagrama de clases  |
| Implementación (CRUD)         | CRUD completo de tareas y cursos; estrategia de Git incluida   |
| Pruebas                       | Agregar pruebas en `tests/` usando `pytest`                    |
| Documentación                 | Este README + docstrings en todos los archivos                 |
| Presentación                  | Usar el prototipo del frontend como demo                       |

## Estrategia de ramas en Git (recomendada)

```
main
└── develop
    ├── feature/tasks-crud
    ├── feature/auth
    ├── feature/courses
    ├── feature/calendar-frontend
    └── feature/reminders
```

> **Tip:** Cada `feature/*` se mergea a `develop` cuando está lista y probada. Solo se sube a `main` cuando todo está estable.
