from sqlalchemy.exc import DBAPIError

# PostgreSQL SQLSTATE for "query_canceled", raised when statement_timeout fires.
QUERY_CANCELED_SQLSTATE = "57014"


class QueryTimeoutError(Exception):
    """A statement was cancelled by the server-side statement_timeout.

    Repositories raise this instead of the driver error so API routes can return
    a specific response (504) without importing SQLAlchemy or asyncpg.
    """


def is_query_timeout(exc: BaseException) -> bool:
    """True when `exc` is PostgreSQL cancelling a statement for exceeding its timeout.

    SQLAlchemy wraps the asyncpg error in DBAPIError; `orig` carries the SQLSTATE.
    """
    return (
        isinstance(exc, DBAPIError)
        and getattr(exc.orig, "sqlstate", None) == QUERY_CANCELED_SQLSTATE
    )
