/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   google.test.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pmarkaid <pmarkaid@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/11 10:33:22 by pmarkaid          #+#    #+#             */
/*   Updated: 2025/04/15 12:23:55 by pmarkaid         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
const Fastify = require('fastify');

// Create a minimal fastify instance for testing (not using your actual server)
const fastify = Fastify({ logger: false });

// Mock Google OAuth handler function
const googleOAuthHandler = async function(request, reply) {
  // In a real system, this would exchange the auth code for a token
  // and fetch user information from Google
  
  // Create a JWT token (in real system this would contain user info)
  const token = 'mock.jwt.token';
  
  // Redirect to the homepage with the token
  return reply.redirect(`/?access_token=${token}`);
};

// Register routes for testing

// Register Google OAuth callback route
fastify.get('/oauth2/google/callback', googleOAuthHandler);

// Register homepage route
fastify.get('/', async (request, reply) => {
  const { access_token } = request.query;
  
  if (access_token) {
    // User is authenticated
    return { message: 'Welcome to the homepage, testuser!' };
  }
  
  // Guest user
  return { message: 'Welcome to the homepage, Guest!' };
});

// Run the server before tests start
t.before(async () => {
  await fastify.ready();
});

// Tests for Google OAuth functionality
t.test('Google OAuth Functionality', async t => {
  
  // Test 1: Homepage for guests
  t.test('GET / returns welcome message for guests', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/'
    });
    
    t.equal(response.statusCode, 200, 'Status code should be 200 OK');
    const payload = JSON.parse(response.payload);
    t.match(payload.message, /Guest/, 'Should welcome guests');
  });
  
  // Test 2: Homepage with access token
  t.test('GET / with token returns personalized welcome message', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/?access_token=mock.jwt.token'
    });
    
    t.equal(response.statusCode, 200, 'Status code should be 200 OK');
    const payload = JSON.parse(response.payload);
    t.match(payload.message, /testuser/, 'Should welcome authenticated user');
  });
  
  // Test 3: Google OAuth callback
  t.test('GET /oauth2/google/callback redirects with token', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth2/google/callback',
      query: { code: 'mock_auth_code' }
    });
    
    t.equal(response.statusCode, 302, 'Status code should be 302 (redirect)');
    const location = response.headers.location;
    t.match(location, /\?access_token=/, 'Redirect URL should contain access token');
  });
});

// Clean up after tests
t.teardown(async () => {
  await fastify.close();
});