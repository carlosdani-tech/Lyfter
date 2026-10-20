from sqlalchemy import update

from app.extensions import db
from app.models import Sale


class EmailRepository:
    @staticmethod
    def claim(sale_id, attempt, now):
        result = db.session.execute(
            update(Sale)
            .where(
                Sale.id == sale_id,
                Sale.email_attempts == attempt,
                Sale.email_status != "sent",
                Sale.email_in_flight.is_(False),
                Sale.email_attempts < 3,
            )
            .values(
                email_status="pending",
                email_in_flight=True,
                email_attempts=attempt + 1,
                email_last_attempt_at=now,
                email_error_code=None,
            )
            .execution_options(synchronize_session=False)
        )
        return result.rowcount == 1

    @staticmethod
    def finish(sale_id, attempt, *, code=None, sent_at=None):
        db.session.execute(
            update(Sale)
            .where(
                Sale.id == sale_id,
                Sale.email_attempts == attempt,
                Sale.email_in_flight.is_(True),
            )
            .values(
                email_status="sent" if sent_at else "failed",
                email_in_flight=False,
                email_sent_at=sent_at,
                email_error_code=code,
            )
            .execution_options(synchronize_session=False)
        )

    @staticmethod
    def defer(sale, code, failed=False):
        sale.email_status = "failed" if failed else "pending"
        sale.email_error_code = code
