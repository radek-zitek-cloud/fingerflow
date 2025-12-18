#!/usr/bin/env python3
"""
Simple SQL migration runner for FingerFlow.

This script runs SQL migrations in order, tracking applied versions in schema_migrations table.
No complex dependency resolution, no auto-generation - just transparent SQL files.

Usage:
    python migrate.py              # Run all pending migrations
    python migrate.py --current    # Show current version
    python migrate.py --reset      # Drop all tables and rerun migrations (DANGEROUS!)
"""
import os
import sys
import psycopg2
import argparse
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def get_connection():
    """Create a direct psycopg2 connection (bypassing SQLAlchemy)."""
    # Parse DATABASE_URL (format: postgresql://user:pass@host:port/dbname)
    url = settings.database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgres://", 1)

    return psycopg2.connect(url)


def ensure_migrations_table(conn):
    """Create schema_migrations table if it doesn't exist."""
    with conn.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        """)
    conn.commit()


def get_current_version(conn):
    """Get the current schema version."""
    ensure_migrations_table(conn)
    with conn.cursor() as cursor:
        cursor.execute("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")
        return cursor.fetchone()[0]


def get_pending_migrations(current_version):
    """Get list of pending migration files."""
    if not MIGRATIONS_DIR.exists():
        return []

    all_migrations = sorted(MIGRATIONS_DIR.glob("*.sql"))
    pending = []

    for migration_file in all_migrations:
        # Extract version from filename (e.g., "001_initial_schema.sql" -> 1)
        try:
            version = int(migration_file.stem.split("_")[0])
            if version > current_version:
                pending.append((version, migration_file))
        except (ValueError, IndexError):
            print(f"Warning: Skipping invalid migration filename: {migration_file.name}")
            continue

    return sorted(pending, key=lambda x: x[0])


def run_migration(conn, version, migration_file):
    """Run a single migration file."""
    print(f"Applying migration {version}: {migration_file.name}...")

    # Read and execute the migration SQL
    sql = migration_file.read_text()

    try:
        with conn.cursor() as cursor:
            # Execute the migration SQL
            cursor.execute(sql)
        conn.commit()
        print(f"✓ Migration {version} applied successfully")
        return True
    except Exception as e:
        conn.rollback()
        print(f"✗ Migration {version} failed: {e}")
        return False


def run_migrations():
    """Run all pending migrations."""
    try:
        conn = get_connection()
        print("Connected to database")

        current_version = get_current_version(conn)
        print(f"Current schema version: {current_version}")

        pending = get_pending_migrations(current_version)

        if not pending:
            print("✓ Database is up to date")
            conn.close()
            return 0

        print(f"Found {len(pending)} pending migration(s)")

        for version, migration_file in pending:
            if not run_migration(conn, version, migration_file):
                print(f"\n✗ Migration failed. Database is at version {get_current_version(conn)}")
                conn.close()
                return 1

        final_version = get_current_version(conn)
        print(f"\n✓ All migrations applied successfully")
        print(f"✓ Database is now at version {final_version}")
        conn.close()
        return 0

    except psycopg2.OperationalError as e:
        print(f"✗ Database connection failed: {e}")
        return 1
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return 1


def show_current():
    """Show current migration version."""
    try:
        conn = get_connection()
        current_version = get_current_version(conn)

        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT version, applied_at, description
                FROM schema_migrations
                ORDER BY version DESC
                LIMIT 5
            """)
            rows = cursor.fetchall()

        print(f"Current schema version: {current_version}")

        if rows:
            print("\nRecent migrations:")
            for version, applied_at, description in rows:
                print(f"  {version}: {description or 'No description'} (applied: {applied_at})")

        conn.close()
        return 0
    except Exception as e:
        print(f"✗ Error: {e}")
        return 1


def reset_database():
    """Drop all tables and rerun migrations (DANGEROUS!)."""
    print("⚠️  WARNING: This will DROP ALL TABLES and data!")
    response = input("Type 'YES' to confirm: ")

    if response != "YES":
        print("Aborted")
        return 1

    try:
        conn = get_connection()
        print("Dropping schema...")

        with conn.cursor() as cursor:
            # Drop everything in public schema
            cursor.execute("DROP SCHEMA public CASCADE")
            cursor.execute("CREATE SCHEMA public")
            cursor.execute("GRANT ALL ON SCHEMA public TO fingerflow")
            cursor.execute("GRANT ALL ON SCHEMA public TO public")

        conn.commit()
        print("✓ Schema dropped and recreated")
        conn.close()

        # Now run migrations
        print("\nRunning migrations...")
        return run_migrations()

    except Exception as e:
        print(f"✗ Error: {e}")
        return 1


def main():
    parser = argparse.ArgumentParser(description="FingerFlow database migration tool")
    parser.add_argument("--current", action="store_true", help="Show current schema version")
    parser.add_argument("--reset", action="store_true", help="Drop all tables and rerun migrations")
    args = parser.parse_args()

    if args.current:
        return show_current()
    elif args.reset:
        return reset_database()
    else:
        return run_migrations()


if __name__ == "__main__":
    sys.exit(main())
