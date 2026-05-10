from flask import Flask, request, jsonify, send_from_directory
from flask_login import LoginManager, login_required, current_user
from models import db, User, Task, Course
from auth import auth
from datetime import datetime, date
import os

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="../frontend", static_url_path="")

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-in-production-please")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///taskboard.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "auth.login"  # redirect to login if unauthenticated

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Authentication required."}), 401

# Register auth blueprint
app.register_blueprint(auth)


# ── Serve frontend ─────────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Serve the frontend (index.html + app.js + app.css)."""
    return send_from_directory(app.static_folder, "index.html")


# ── Task routes ────────────────────────────────────────────────────────────────

@app.route("/api/tasks", methods=["GET"])
@login_required
def get_tasks():
    """
    GET /api/tasks
    Query params:
      - course_id (int)     filter by course
      - status   (str)      Pending | Completed
      - priority (str)      High | Medium | Low
      - due_from (YYYY-MM-DD)
      - due_to   (YYYY-MM-DD)
    """
    query = Task.query.filter_by(user_id=current_user.id)

    course_id = request.args.get("course_id", type=int)
    status = request.args.get("status")
    priority = request.args.get("priority")
    due_from = request.args.get("due_from")
    due_to = request.args.get("due_to")

    if course_id:
        query = query.filter_by(course_id=course_id)
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if due_from:
        query = query.filter(Task.due_date >= date.fromisoformat(due_from))
    if due_to:
        query = query.filter(Task.due_date <= date.fromisoformat(due_to))

    tasks = query.order_by(Task.due_date.asc()).all()
    return jsonify({"tasks": [t.to_dict() for t in tasks]}), 200


@app.route("/api/tasks", methods=["POST"])
@login_required
def create_task():
    """
    POST /api/tasks
    Body (JSON):
      title        (str, required)
      description  (str)
      due_date     (YYYY-MM-DD)
      priority     (High | Medium | Low)
      course_id    (int)
      reminder_at  (YYYY-MM-DDTHH:MM:SS)
    """
    data = request.get_json()

    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400

    due_date = None
    if data.get("due_date"):
        try:
            due_date = date.fromisoformat(data["due_date"])
        except ValueError:
            return jsonify({"error": "Invalid due_date format. Use YYYY-MM-DD."}), 400

    reminder_at = None
    if data.get("reminder_at"):
        try:
            reminder_at = datetime.fromisoformat(data["reminder_at"])
        except ValueError:
            return jsonify({"error": "Invalid reminder_at format. Use ISO 8601."}), 400

    course_id = data.get("course_id")
    if course_id:
        course = Course.query.filter_by(id=course_id, user_id=current_user.id).first()
        if not course:
            return jsonify({"error": "Course not found."}), 404

    priority = data.get("priority", "Medium")
    if priority not in ("High", "Medium", "Low"):
        return jsonify({"error": "priority must be High, Medium, or Low."}), 400

    task = Task(
        title=title,
        description=data.get("description", ""),
        due_date=due_date,
        priority=priority,
        status="Pending",
        reminder_at=reminder_at,
        user_id=current_user.id,
        course_id=course_id,
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({"task": task.to_dict()}), 201


@app.route("/api/tasks/<int:task_id>", methods=["GET"])
@login_required
def get_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    return jsonify({"task": task.to_dict()}), 200


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    """
    PUT /api/tasks/<id>
    Accepts any subset of task fields to update.
    """
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    data = request.get_json()

    if "title" in data:
        title = data["title"].strip()
        if not title:
            return jsonify({"error": "Title cannot be empty."}), 400
        task.title = title

    if "description" in data:
        task.description = data["description"]

    if "due_date" in data:
        if data["due_date"]:
            try:
                task.due_date = date.fromisoformat(data["due_date"])
            except ValueError:
                return jsonify({"error": "Invalid due_date format."}), 400
        else:
            task.due_date = None

    if "priority" in data:
        if data["priority"] not in ("High", "Medium", "Low"):
            return jsonify({"error": "priority must be High, Medium, or Low."}), 400
        task.priority = data["priority"]

    if "status" in data:
        if data["status"] not in ("Pending", "Completed"):
            return jsonify({"error": "status must be Pending or Completed."}), 400
        task.status = data["status"]

    if "course_id" in data:
        if data["course_id"]:
            course = Course.query.filter_by(id=data["course_id"], user_id=current_user.id).first()
            if not course:
                return jsonify({"error": "Course not found."}), 404
        task.course_id = data["course_id"]

    if "reminder_at" in data:
        if data["reminder_at"]:
            try:
                task.reminder_at = datetime.fromisoformat(data["reminder_at"])
            except ValueError:
                return jsonify({"error": "Invalid reminder_at format."}), 400
        else:
            task.reminder_at = None

    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"task": task.to_dict()}), 200


@app.route("/api/tasks/<int:task_id>/complete", methods=["PATCH"])
@login_required
def toggle_complete(task_id):
    """PATCH /api/tasks/<id>/complete — toggles Pending ↔ Completed."""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    task.status = "Completed" if task.status == "Pending" else "Pending"
    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"task": task.to_dict()}), 200


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted."}), 200


# ── Course routes ──────────────────────────────────────────────────────────────

@app.route("/api/courses", methods=["GET"])
@login_required
def get_courses():
    courses = Course.query.filter_by(user_id=current_user.id).order_by(Course.name).all()
    return jsonify({"courses": [c.to_dict() for c in courses]}), 200


@app.route("/api/courses", methods=["POST"])
@login_required
def create_course():
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Course name is required."}), 400

    color = data.get("color", "#1D9E75")
    course = Course(name=name, color=color, user_id=current_user.id)
    db.session.add(course)
    db.session.commit()
    return jsonify({"course": course.to_dict()}), 201


@app.route("/api/courses/<int:course_id>", methods=["PUT"])
@login_required
def update_course(course_id):
    course = Course.query.filter_by(id=course_id, user_id=current_user.id).first_or_404()
    data = request.get_json()
    if "name" in data:
        course.name = data["name"].strip() or course.name
    if "color" in data:
        course.color = data["color"]
    db.session.commit()
    return jsonify({"course": course.to_dict()}), 200


@app.route("/api/courses/<int:course_id>", methods=["DELETE"])
@login_required
def delete_course(course_id):
    course = Course.query.filter_by(id=course_id, user_id=current_user.id).first_or_404()
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted."}), 200


# ── Reminders endpoint ─────────────────────────────────────────────────────────

@app.route("/api/tasks/reminders/due", methods=["GET"])
@login_required
def get_due_reminders():
    """
    Returns tasks where reminder_at is in the past and status is still Pending.
    The frontend polls this periodically to show notifications.
    """
    now = datetime.utcnow()
    tasks = Task.query.filter(
        Task.user_id == current_user.id,
        Task.reminder_at != None,
        Task.reminder_at <= now,
        Task.status == "Pending",
    ).all()
    return jsonify({"reminders": [t.to_dict() for t in tasks]}), 200


# ── DB initialization ──────────────────────────────────────────────────────────
with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
