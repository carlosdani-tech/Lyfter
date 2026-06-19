from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = "postgresql+psycopg2://postgres:Carlosgp@localhost:5432/postgres"
DB_SCHEMA = "lyfter_authorization"

engine = create_engine(
    DATABASE_URL,
    connect_args={"options": f"-csearch_path={DB_SCHEMA}"},
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

Base = declarative_base()


def get_session():
    return SessionLocal()


def init_db():
    import models

    Base.metadata.create_all(bind=engine)
