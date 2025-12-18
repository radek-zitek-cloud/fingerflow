-- Initial FingerFlow Schema
-- Generated from SQLAlchemy models
-- Version: 001

-- Create ENUM types
CREATE TYPE eventtype AS ENUM ('DOWN', 'UP');
CREATE TYPE fingerposition AS ENUM (
    'L_PINKY', 'L_RING', 'L_MIDDLE', 'L_INDEX', 'L_THUMB',
    'R_THUMB', 'R_INDEX', 'R_MIDDLE', 'R_RING', 'R_PINKY'
);

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255),
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    created_at BIGINT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{"theme":"default","sessionMode":"wordcount","timedDuration":30,"wordCount":20,"viewMode":"ticker","selectedWordSetId":null}'::jsonb,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at BIGINT,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    two_factor_backup_codes VARCHAR(500),
    failed_login_attempts BIGINT NOT NULL DEFAULT 0,
    account_locked_until BIGINT,
    last_failed_login BIGINT,
    last_successful_login BIGINT
);

-- Users indexes
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_auth_provider ON users(auth_provider);

-- Word sets table
CREATE TABLE word_sets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    words JSONB NOT NULL
);

-- Word sets indexes
CREATE INDEX idx_word_sets_name ON word_sets(name);

-- Typing sessions table
CREATE TABLE typing_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    wpm DOUBLE PRECISION,
    mechanical_wpm DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    total_characters BIGINT,
    correct_characters BIGINT,
    incorrect_characters BIGINT,
    total_keystrokes BIGINT,
    practice_text TEXT
);

-- Typing sessions indexes
CREATE INDEX idx_session_user_id ON typing_sessions(user_id);
CREATE INDEX idx_session_start_time ON typing_sessions(start_time);
CREATE INDEX idx_session_user_start ON typing_sessions(user_id, start_time);

-- Telemetry events table (high-frequency writes)
CREATE TABLE telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES typing_sessions(id) ON DELETE CASCADE,
    event_type eventtype NOT NULL,
    key_code VARCHAR(50) NOT NULL,
    timestamp_offset BIGINT NOT NULL,
    finger_used fingerposition NOT NULL,
    is_error BOOLEAN NOT NULL DEFAULT FALSE
);

-- Telemetry events indexes (optimized for analytics)
CREATE INDEX idx_telemetry_session_id ON telemetry_events(session_id);
CREATE INDEX idx_telemetry_session_event_type ON telemetry_events(session_id, event_type);
CREATE INDEX idx_telemetry_session_timestamp ON telemetry_events(session_id, timestamp_offset);
CREATE INDEX idx_telemetry_key_code ON telemetry_events(key_code);
CREATE INDEX idx_telemetry_finger_used ON telemetry_events(finger_used);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Password reset tokens indexes
CREATE INDEX idx_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_reset_user_id ON password_reset_tokens(user_id);

-- Email verification tokens table
CREATE TABLE email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Email verification tokens indexes
CREATE INDEX idx_verify_token ON email_verification_tokens(token);
CREATE INDEX idx_verify_expires ON email_verification_tokens(expires_at);
CREATE INDEX idx_verify_user_id ON email_verification_tokens(user_id);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    device_info VARCHAR(255)
);

-- Refresh tokens indexes
CREATE INDEX idx_refresh_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

-- Migration version tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, description) VALUES (1, 'Initial schema with all tables');
