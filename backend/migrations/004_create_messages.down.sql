-- Rollback: 004_create_messages
DROP TRIGGER  IF EXISTS messages_search_vector_trigger ON messages;
DROP FUNCTION IF EXISTS messages_search_vector_update;
DROP TABLE    IF EXISTS file_attachments;
DROP TABLE    IF EXISTS messages;