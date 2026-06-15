from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql+psycopg2://postgres:Carlosgp@localhost:5432/postgres"

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={
        "options": "-csearch_path=lyfter_orm"
    }
)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()