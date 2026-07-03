from app.extensions import db
from app.models.mixins import TimestampMixin


class Cart(TimestampMixin, db.Model):
    __tablename__ = "carts"

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('active', 'checked_out', 'abandoned')",
            name="ck_carts_status",
        ),
        db.Index("ix_carts_user_id", "user_id"),
        db.Index("ix_carts_status", "status"),
        db.Index("ix_carts_user_status", "user_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="active")

    user = db.relationship("User", back_populates="carts")
    items = db.relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
    )
    sale = db.relationship("Sale", back_populates="cart", uselist=False)