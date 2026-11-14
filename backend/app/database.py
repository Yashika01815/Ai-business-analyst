from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.config import settings

db_url = settings.DATABASE_URL
# Some providers hand out URLs with the legacy "postgres://" scheme.
# SQLAlchemy 2.x requires "postgresql://".
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
# Pin the psycopg2 driver (from requirements.txt); newer SQLAlchemy releases
# default plain "postgresql://" URLs to psycopg 3 instead.
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine_kwargs = {"pool_pre_ping": True}
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    url = make_url(db_url)
    host = url.host or ""
    if "supabase.co" in host or "supabase.com" in host:
        # Supabase only accepts encrypted connections.
        if "sslmode" not in url.query:
            connect_args["sslmode"] = "require"
        # Port 6543 is Supabase's transaction pooler (Supavisor), which already
        # pools connections server-side; holding our own pool on top of it
        # breaks transaction-mode semantics.
        if url.port == 6543:
            engine_kwargs["poolclass"] = NullPool

engine = create_engine(db_url, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
