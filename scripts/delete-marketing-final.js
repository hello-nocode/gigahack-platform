#!/usr/bin/env node
/**
 * Final deletion script for marketing@technovator.world
 * Handles the user with ID be988db9-5ee4-475a-8399-90505c6eaea5
 */

const { Pool } = require('pg');

const USER_EMAIL = 'marketing@technovator.world';
const USER_ID = 'be988db9-5ee4-475a-8399-90505c6eaea5';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteUser() {
  const client = await pool.connect();
  
  try {
    console.log(`🚨 DELETING: ${USER_EMAIL} (${USER_ID})`);
    
    // Check user exists
    const userCheck = await client.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [USER_ID]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found: ${userCheck.rows[0].name}`);
    
    // 1. Clear all sessions first
    console.log('\n🗑️ Clearing sessions...');
    const sessionsDeleted = await client.query(
      'DELETE FROM sessions WHERE user_id = $1 RETURNING session_token',
      [USER_ID]
    );
    console.log(`   Deleted ${sessionsDeleted.rowCount} session(s)`);
    
    // 2. Delete OAuth accounts
    console.log('🗑️ Deleting OAuth accounts...');
    const accountsResult = await client.query(
      'DELETE FROM accounts WHERE user_id = $1 RETURNING provider, provider_account_id',
      [USER_ID]
    );
    console.log(`   Deleted ${accountsResult.rowCount} account(s):`);
    accountsResult.rows.forEach(acc => {
      console.log(`     - ${acc.provider}: ${acc.provider_account_id}`);
    });
    
    // 3. Handle teams where user is leader
    console.log('\n📋 Checking teams as leader...');
    const teamsResult = await client.query(
      'SELECT id, name FROM teams WHERE leader_id = $1',
      [USER_ID]
    );
    
    for (const team of teamsResult.rows) {
      // Find another member
      const membersResult = await client.query(
        'SELECT user_id FROM team_members WHERE team_id = $1 AND user_id != $2',
        [team.id, USER_ID]
      );
      
      if (membersResult.rows.length > 0) {
        const newLeader = membersResult.rows[0].user_id;
        console.log(`   → Transferring "${team.name}" to ${newLeader}`);
        await client.query(
          'UPDATE teams SET leader_id = $1 WHERE id = $2',
          [newLeader, team.id]
        );
      } else {
        console.log(`   → Deleting "${team.name}" (no members)`);
        await client.query('DELETE FROM teams WHERE id = $1', [team.id]);
      }
    }
    
    // 4. Delete user - CASCADE handles rest
    console.log('\n🗑️ Deleting user...');
    await client.query('DELETE FROM users WHERE id = $1', [USER_ID]);
    
    // 5. Verify deletion
    const verifyResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE id = $1 OR email = $2',
      [USER_ID, USER_EMAIL]
    );
    
    if (parseInt(verifyResult.rows[0].count) === 0) {
      console.log('\n✅✅✅ USER COMPLETELY DELETED! ✅✅✅');
      console.log('\nAll OAuth accounts and sessions cleared.');
      console.log('User must re-authenticate with Google to create new account.');
    } else {
      console.log('\n⚠️ Warning: User or related data still exists!');
      console.log(verifyResult.rows[0]);
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
