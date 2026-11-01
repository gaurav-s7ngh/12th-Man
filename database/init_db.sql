-- 12th Man Database Initialization Script
-- Run as postgres superuser or owner of twelve_man database

-- Ensure database exists (in psql command line)
-- CREATE DATABASE twelve_man ENCODING 'UTF8';

-- Connect to twelve_man
\c twelve_man;

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Include full schema
\i schema.sql;
