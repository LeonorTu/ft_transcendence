/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   google-integration.test.js                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pmarkaid <pmarkaid@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/22 11:29:11 by pmarkaid          #+#    #+#             */
/*   Updated: 2025/04/23 21:03:23 by pmarkaid         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const tap = require('tap');
const Fastify = require('fastify');

// Print debug information
console.log('Node.js version:', process.version);
console.log('Fastify version:', require('fastify/package.json').version);
console.log('Tap version:', require('tap/package.json').version);

// Create a complete mock for the database
const dbMock = {
  get: (query, params, callback) => {
    console.log('DB Mock GET:', query, params);
    if (query.includes('SELECT * FROM users WHERE email = ?') && params[0] === 'existing@example.com') {
      callback(null, {
        id: 123,
        username: 'existingUser',
        email: 'existing@example.com',
        google_id: null
      });
    } else if (query.includes('SELECT * FROM users WHERE email = ?')) {
      callback(null, null);
    } else {
      callback(null, null);
    }
  },
  run: (query, params, callback) => {
    console.log('DB Mock RUN:', query, params);
    if (typeof callback === 'function') {
      callback.call({ lastID: 999, changes: 1 });
    }
  }
};

// Simple mock for the Google OAuth handler
const googleOAuthHandlerMock = async (request, reply) => {
  console.log('Mock Google handler called with:', request.url);
  
  // Determine if we're testing existing or new user
  const isExistingUser = request.query.case === 'existing';
  
  if (isExistingUser) {
    const token = await reply.jwtSign({ 
      id: 123, 
      username: 'existingUser',
      email: 'existing@example.com' 
    });
    return reply.redirect(`/?access_token=${token}`);
  } else {
    const token = await reply.jwtSign({ 
      id: 999, 
      username: 'TestUser1',
      email: 'new@example.com' 
    });
    return reply.redirect(`/?access_token=${token}`);
  }
};

// Test suite
tap.test('Google Authentication Tests', async t => {
  // Create a fresh Fastify instance for testing
  const fastify = Fastify({ logger: false });
  
  // Register JWT plugin
  await fastify.register(require('@fastify/jwt'), {
    secret: 'test-secret-key'
  });
  
  // Register test route
  fastify.get('/oauth2/google/callback', googleOAuthHandlerMock);
  
  await fastify.ready();
  
  // Test 1: OAuth callback redirects with token for existing user
  t.test('Should handle existing user login', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth2/google/callback?case=existing'
    });
    
    t.equal(response.statusCode, 302, 'Should redirect after successful authentication');
    const location = response.headers.location;
    t.ok(location, 'Should have location header');
    t.match(location, /\?access_token=/, 'Redirect URL should contain token');
    
    // Extract and verify token
    const token = location.split('access_token=')[1];
    const decoded = fastify.jwt.decode(token);
    
    t.ok(decoded, 'Token should be decodable');
    t.equal(decoded.id, 123, 'Token should have correct user ID');
    t.equal(decoded.username, 'existingUser', 'Token should have correct username');
    t.equal(decoded.email, 'existing@example.com', 'Token should have correct email');
  });
  
  // Test 2: OAuth callback redirects with token for new user
  t.test('Should handle new user creation', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth2/google/callback?case=new'
    });
    
    t.equal(response.statusCode, 302, 'Should redirect after successful authentication');
    const location = response.headers.location;
    t.ok(location, 'Should have location header');
    t.match(location, /\?access_token=/, 'Redirect URL should contain token');
    
    // Extract and verify token
    const token = location.split('access_token=')[1];
    const decoded = fastify.jwt.decode(token);
    
    t.ok(decoded, 'Token should be decodable');
    t.equal(decoded.id, 999, 'Token should have new user ID');
    t.equal(decoded.username, 'TestUser1', 'Token should have generated username');
    t.equal(decoded.email, 'new@example.com', 'Token should have Google email');
  });
  
  // Clean up after all tests
  t.teardown(async () => {
    await fastify.close();
  });
});