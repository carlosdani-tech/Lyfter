from app.extensions import db
from app.models.mixins import TimestampMixin


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    __table_args__ = (
        db.UniqueConstraint("email", name="uq_users_email"),
        db.Index("ix_users_role_id", "role_id"),
        db.Index("ix_users_is_active", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    role = db.relationship("Role", back_populates="users")
    carts = db.relationship("Cart", back_populates="user")
    sales = db.relationship("Sale", back_populates="user")