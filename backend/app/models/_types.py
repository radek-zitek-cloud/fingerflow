"""SQLAlchemy column types with SQLite-friendly variants."""

from sqlalchemy import BigInteger, Integer

# SQLite only auto-increments PRIMARY KEY when the type is exactly INTEGER.
# In Postgres we still want BIGINT for scalability, so we use a dialect variant.
BIGINT_PK = BigInteger().with_variant(Integer, "sqlite")
BIGINT_FK = BigInteger().with_variant(Integer, "sqlite")

