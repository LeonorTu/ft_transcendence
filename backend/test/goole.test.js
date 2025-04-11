require('dotenv').config();
const t = require('tap');
const nock = require('nock');

// Set required environment variables for the test
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

t.test('Google OAuth Flow', async t => {
  // Mock the Google OAuth2 provider responses
  const mockOAuth2 = {
    getAccessTokenFromAuthorizationCodeFlow: async () => ({
      token: {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      }
    })
  };
  
  // Mock the fetch API to Google's userinfo endpoint
  nock('https://www.googleapis.com')
    .get('/oauth2/v2/userinfo')
    .reply(200, {
      id: 'google123',
      email: 'test@example.com',
      given_name: 'Test',
      family_name: 'User',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg'
    });
  
  // Mock the database operations
  const dbMock = {
    get: (sql, params, cb) => {
      // When checking for an existing user
      if (sql.includes('SELECT * FROM users WHERE email = ?')) {
        // Simulate no user found with this email
        cb(null, null);
      } else {
        cb(null, null);
      }
    },
    run: (sql, params, cb) => {
      // When inserting a new user
      if (sql.includes('INSERT INTO users')) {
        cb(null, { lastID: 999 });
      } else {
        cb(new Error('Unexpected SQL query'));
      }
    }
  };
  
  // Create a fastify server with our mocks
  const fastify = require('fastify')({ logger: false });
  
  // Mock the JWT plugin
  fastify.register(require('@fastify/jwt'), {
    secret: 'test-secret'
  });
  
  // Decorate with the mocked OAuth2 client
  fastify.decorate('googleOAuth2', mockOAuth2);
  
  // Register a mock redirect method
  fastify.decorateReply('redirect', function(url) {
    this.code(302).header('Location', url).send();
  });
  
  // Mock the db module
  t.mockRequire('../db', dbMock);
  
  // Register our Google routes
  const googleRoutes = require('../google.js');
  fastify.register(googleRoutes);
  
  await fastify.ready();
  
  // Test the callback route
  const response = await fastify.inject({
    method: 'GET',
    url: '/oauth2/google/callback',
    query: {
      code: 'valid-auth-code'
    }
  });
  
  // Check the response
  t.equal(response.statusCode, 302, 'OAuth callback should redirect');
  t.ok(response.headers.location.includes('access_token='), 'Redirects with access token');
  
  // Test the home route with the token to verify it works
  const homeResponse = await fastify.inject({
    method: 'GET',
    url: '/',
    query: {
      access_token: response.headers.location.split('access_token=')[1]
    }
  });
  
  t.equal(homeResponse.statusCode, 200, 'Home route returns 200 with valid token');
  const homeBody = JSON.parse(homeResponse.payload);
  t.match(homeBody.message, /Welcome to the homepage/, 'Returns welcome message');
  
  await fastify.close();
});