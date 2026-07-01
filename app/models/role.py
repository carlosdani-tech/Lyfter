from app.extensions import db
from app.models.mixins import TimestampMixin


class Role(TimestampMixin, db.Model):
    __tablename__ = "roles"

    __table_args__ = (db.UniqueConstraint("name", name="uq_roles_name"),)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255), nullable=True)

    users = db.relationship("User", back_populates="role")