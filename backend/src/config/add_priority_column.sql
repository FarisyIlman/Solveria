-- Add priority column to tasks table
ALTER TABLE tasks
ADD COLUMN priority ENUM('1', '2', '3') DEFAULT '1';
