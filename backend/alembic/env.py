import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the backend directory to path so we can import app models
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models import Base

# this is the Alembic Config object
config = context.config

# Set the database URL from environment variable
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL environment variable is required for Alembic")
config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use our models' metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
