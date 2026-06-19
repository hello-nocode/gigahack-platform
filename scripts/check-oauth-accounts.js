#!/usr/bin/env node
/**
 * Check OAuth accounts and users for debugging
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAccounts() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for marketing@technovator.world...');
    const marketingUser = await client.query(
      'SELECT id, name, email, created_at FROM users WHERE email = $1',
      ['marketing@technovator.world']
    );
    
    if (marketingUser.rows.length > 0) {
      console.log('⚠️  User still exists!');
      console.log(marketingUser.rows[0]);
    } else {
      console.log('✅ User marketing@technovator.world NOT found (deleted)');
    }
    
    console.log('\n🔍 Checking for verhan77@gmail.com...');
    const verhanUser = await client.query(
      'SELECT id, name, email, created_at FROM users WHERE email = $1',
      ['verhan77@gmail.com']
    );
    
    if (verhanUser.rows.length > 0) {
      console.log('✅ Found user:');
      console.log(verhanUser.rows[0]);
      
      // Check OAuth accounts
      console.log('\n📋 OAuth accounts for this user:');
      const accounts = await client.query(
        'SELECT provider, provider_account_id, type FROM accounts WHERE user_id = $1',
        [verhanUser.rows[0].id]
      );
      console.log(accounts.rows);
      
    } else {
      console.log('❌ User verhan77@gmail.com NOT found');
    }
    
    // Check ALL Google OAuth accounts to see if there's a link
    console.log('\n🔍 All Google OAuth accounts:');
    const googleAccounts = await client.query(
      `SELECT a.provider, a.provider_account_id, a.user_id, u.email, u.name
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.provider = 'google'
       ORDER BY u.email`
    );
    
    console.log(`Found ${googleAccounts.rows.length} Google account(s):`);
    googleAccounts.rows.forEach(acc => {
      console.log(`  - ${acc.email} (${acc.name})`);
      console.log(`    Provider ID: ${acc.provider_account_id}`);
      console.log(`    User ID: ${acc.user_id}`);
    });
    
    // Check if emails are similar or if there's session data
    console.log('\n🔍 Checking sessions...');
    const sessions = await client.query(
      `SELECT s.session_token, s.user_id, u.email, s.expires
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE u.email LIKE '%technovator%' OR u.email LIKE '%verhan%'
       ORDER BY s.expires DESC`
    );
    
    console.log(`Found ${sessions.rows.length} session(s):`);
    sessions.rows.forEach(s => {
      console.log(`  - ${s.email} (expires: ${s.expires})`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAccounts();
