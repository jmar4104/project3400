from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Course

auth = Blueprint("auth", __name__)


@auth.route("/api/auth/register", methods=["POST"])
def register():
    """Register a new user account."""
    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # Basic validation
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with that email already exists."}), 409

    # Create user
    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    # Create default starter courses
    default_courses = [
        Course(name="General", color="#1D9E75", user_id=user.id),
        Course(name="Course 1", color="#7F77DD", user_id=user.id),
    ]
    db.session.add_all(default_courses)
    db.session.commit()

    login_user(user)
    return jsonify({
        "message": "Account created successfully.",
        "user": {"id": user.id, "name": user.name, "email": user.email},
    }), 201


@auth.route("/api/auth/login", methods=["POST"])
def login():
    """Log in with email and password."""
    data = request.get_json()

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password."}), 401

    login_user(user, remember=data.get("remember", False))
    return jsonify({
        "message": "Logged in successfully.",
        "user": {"id": user.id, "name": user.name, "email": user.email},
    }), 200


@auth.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    """Log out the current user."""
    logout_user()
    return jsonify({"message": "Logged out successfully."}), 200


@auth.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    """Return the currently authenticated user."""
    return jsonify({
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
        }
    }), 200
