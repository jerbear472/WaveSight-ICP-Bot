-- Fix the bot_sessions table by adding the ended_at column
ALTER TABLE bot_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;