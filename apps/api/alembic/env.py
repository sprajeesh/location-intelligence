from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.config.settings import get_settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# No ORM models -- migrations use raw op.execute()/op.create_table(), so there's
# nothing for autogenerate to diff against.
target_metadata = None

# The app connects at runtime via asyncpg with a plain postgresql:// DSN (see
# app/repositories/db/connection.py). Alembic runs its own synchronous
# connection via psycopg instead, so force that driver here rather than
# hand-editing sqlalchemy.url in alembic.ini for every environment.
_database_url = get_settings().database_url.replace("postgresql://", "postgresql+psycopg://", 1)
# configparser's default interpolation treats "%" as special (requires "%%"
# for a literal percent) -- a percent-encoded password character (e.g. "+"
# as "%2B") in the DSN otherwise raises "invalid interpolation syntax" here.
config.set_main_option("sqlalchemy.url", _database_url.replace("%", "%%"))

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
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
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
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
