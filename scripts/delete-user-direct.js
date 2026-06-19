#!/usr/bin/env node
/**
 * Direct deletion script using postgres driver
 * Run with: node scripts/delete-user-direct.js
 */

const { Pool } = require('pg');

const USER_EMAIL = 'marketing@technovator.world';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteUser() {
  const client = await pool.connect();
  
  try {
    console.log(`🔍 Looking for user: ${USER_EMAIL}`);
    
    // Find user
    const userResult = await client.query(
      'SELECT id, name, email, created_at FROM users WHERE email = $1',
      [USER_EMAIL]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.name} (${user.id})`);
    console.log(`   Created: ${user.created_at}`);
    
    const userId = user.id;
    
    // Check teams where user is leader
    const teamsResult = await client.query(
      'SELECT id, name, event_id FROM teams WHERE leader_id = $1',
      [userId]
    );
    
    console.log(`\n📊 Teams where user is leader: ${teamsResult.rows.length}`);
    
    for (const team of teamsResult.rows) {
      // Check for other members
      const membersResult = await client.query(
        'SELECT user_id FROM team_members WHERE team_id = $1 AND user_id != $2',
        [team.id, userId]
      );
      
      if (membersResult.rows.length > 0) {
        const newLeader = membersResult.rows[0].user_id;
        console.log(`  → Transferring "${team.name}" to member ${newLeader}`);
        await client.query(
          'UPDATE teams SET leader_id = $1 WHERE id = $2',
          [newLeader, team.id]
        );
      } else {
        console.log(`  → Deleting team "${team.name}" (no other members)`);
        await client.query('DELETE FROM teams WHERE id = $1', [team.id]);
      }
    }
    
    // Delete user - CASCADE handles most related data
    console.log('\n🗑️ Deleting user and all related data...');
    
    // These are handled by CASCADE from users table:
    // - accounts (ON DELETE CASCADE)
    // - sessions (ON DELETE CASCADE)
    // - partnerProfiles (ON DELETE CASCADE)
    // - eventRegistrations (ON DELETE CASCADE)
    // - eventTickets (ON DELETE SET NULL on claimedBy)
    // - mentorBookings (ON DELETE CASCADE via userId)
    // - notifications (ON DELETE CASCADE)
    // - notificationPreferences (ON DELETE CASCADE)
    // - announcements (ON DELETE CASCADE)
    // - teamMembers (ON DELETE CASCADE)
    // - teamJoinRequests (ON DELETE CASCADE)
    
    // Note: teamChallengeApplications may have ON DELETE behavior depending on setup
    // Let's explicitly clean up
    
    // Clean up any challenge applications for teams the user was in
    await client.query(`
      DELETE FROM team_challenge_applications 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = $1
      )
    `, [userId]);
    
    // Finally delete user
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    // Verify
    const verifyResult = await client.query(
      'SELECT COUNT(*) FROM users WHERE id = $1',
      [userId]
    );
    
    if (parseInt(verifyResult.rows[0].count) === 0) {
      console.log('\n✅ User completely deleted!');
      console.log('\n📋 Deleted data includes:');
      console.log('   • User profile and OAuth accounts');
      console.log('   • All sessions');
      console.log('   • Partner profile (if any)');
      console.log('   • Event registrations and tickets');
      console.log('   • Team memberships and join requests');
      console.log('   • Mentor bookings');
      console.log('   • Notifications and preferences');
      console.log('   • Challenge applications');
      console.log('   • Teams handled (transferred or deleted)');
    } else {
      console.log('\n❌ Error: User still exists!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteUser()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
