-- SQL Script to completely delete a user from the database
-- WARNING: This is irreversible!
-- Run with: psql $DATABASE_URL -f delete-user.sql -v user_id='"USER_ID_HERE"'

-- Before deleting, check what the user owns:
-- Teams where user is leader (must handle these first due to RESTRICT constraint)
SELECT t.id, t.name, t.event_id 
FROM teams t 
WHERE t.leader_id = :'user_id';

-- If user is leader of any teams, you must either:
-- 1. Delete the teams first, OR
-- 2. Transfer leadership to another team member

-- To transfer leadership (example - replace with actual new leader ID):
-- UPDATE teams SET leader_id = 'NEW_LEADER_ID' WHERE leader_id = :'user_id';

-- To delete teams where user is leader:
-- DELETE FROM teams WHERE leader_id = :'user_id';
-- (This will cascade delete team_members, applications, join requests, etc.)

-- Once teams are handled, delete the user (cascade will handle most related data):
DELETE FROM users WHERE id = :'user_id';

-- Verify deletion
SELECT COUNT(*) as remaining FROM users WHERE id = :'user_id';
