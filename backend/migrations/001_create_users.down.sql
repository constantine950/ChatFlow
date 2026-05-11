-- Rollback: 001_create_users
DROP TRIGGER  IF EXISTS users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at;
DROP TABLE    IF EXISTS users;