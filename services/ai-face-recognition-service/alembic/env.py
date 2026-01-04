"""Alembic env for ai-face-recognition-service (service-local)."""
from logging.config import fileConfig
import os
import sys

# Ensure service root is on path so `import app` resolves to services/ai-face-recognition-service/app
service_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, service_root)

from alembic import context
from sqlalchemy import engine_from_config, pool

# import app settings and Base metadata from the service package
from app.core.config import settings
from app.core.database import Base

config = context.config

# Override sqlalchemy.url with the service DATABASE_URL if available
if hasattr(settings, 'DATABASE_URL') and settings.DATABASE_URL:
    config.set_main_option('sqlalchemy.url', settings.DATABASE_URL)

fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
