from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tasks = db.relationship("Task", backref="owner", lazy=True, cascade="all, delete-orphan")
    courses = db.relationship("Course", backref="owner", lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(7), default="#1D9E75")  # hex color
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tasks = db.relationship("Task", backref="course_ref", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
        }

    def __repr__(self):
        return f"<Course {self.name}>"


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    due_date = db.Column(db.Date, nullable=True)
    priority = db.Column(db.String(10), default="Medium")  # High / Medium / Low
    status = db.Column(db.String(15), default="Pending")   # Pending / Completed
    reminder_at = db.Column(db.DateTime, nullable=True)    # optional reminder datetime
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "priority": self.priority,
            "status": self.status,
            "reminder_at": self.reminder_at.isoformat() if self.reminder_at else None,
            "course_id": self.course_id,
            "course_name": self.course_ref.name if self.course_ref else None,
            "course_color": self.course_ref.color if self.course_ref else None,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Task {self.title}>"
