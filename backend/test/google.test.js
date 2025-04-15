/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   google.test.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pmarkaid <pmarkaid@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/11 10:33:22 by pmarkaid          #+#    #+#             */
/*   Updated: 2025/04/15 12:14:50 by pmarkaid         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
const path = require('path');
const proxyquire = require('proxyquire');

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Check if required environment variables are loaded
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing required environment variables: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// Mock the database module
const dbMock = {
  Database: function(path, callback) {
    if (typeof path !== 'string' || !path) {
      throw new TypeError('String expected');
    }
    if (callback) callback(null); // Simulate successful database initialization
    return {
      get: function(sql, params, cb) {
        if (sql.includes('SELECT * FROM users WHERE email =')) {
          // Return a user for Google sign in
          cb(null, { id: 1, username: 'testuser', email: 'test@example.com' });
        } else if (sql.includes('SELECT * FROM users WHERE id =')) {
          // Return user when checking by ID
          cb(null, { id: 1, username: 'testuser', email: 'test@example.com' });
        } else {
          // Return null for other queries
          cb(null, null);
        }
      },
      run: function(sql, params, cb) {
        // Mock the run method to simulate successful operations
        if (typeof cb === 'function') {
          cb(null, { lastID: 999, changes: 1 });
        } else {
          params(null, { lastID: 999, changes: 1 });
        }
      },
      all: function(sql, params, cb) {
        // For user listing
        cb(null, [{ id: 1, username: 'testuser' }]);
      },
      close: function(cb) {
        if (cb) cb();
      }
    };
  }
};

// Mock the fetch API used in googleOAuthHandler
global.fetch = async function(url, options) {
  if (url === 'https://www.googleapis.com/oauth2/v2/userinfo') {
    return {
      ok: true,
      json: async () => ({
        id: 'google123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User'
      })
    };
  }
  throw new Error(`Unmocked fetch call to ${url}`);
};

// Create an OAuth mock
const oauthMock = function(fastify, opts, done) {
  fastify.decorate('googleOAuth2', {
    getAccessTokenFromAuthorizationCodeFlow: async (request) => {
      return {
        token: {
          access_token: 'mock_access_token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };
    }
  });
  done();
};

// Create mock JWT functions for all Fastify instance
const mockJwt = function(fastify, opts, done) {
  // Decorate reply with jwtSign
  fastify.decorateReply('jwtSign', function(payload) {
    return Promise.resolve('mock.jwt.token');
  });
  
  // Decorate request with jwtVerify
  fastify.decorateRequest('jwtVerify', function() {
    this.user = { id: 1, username: 'testuser' };
    return Promise.resolve(this.user);
  });
  
  // Add the actual JWT object
  fastify.decorate('jwt', {
    sign: () => 'mock.jwt.token',
    verify: () => ({ id: 1, username: 'testuser' })
  });
  
  done();
};

// Mock the authenticate decorator used in routes
const mockAuth = function(fastify, opts, done) {
  fastify.decorate('authenticate', async function(request, reply) {
    request.user = { id: 1, username: 'testuser' };
    return;
  });
  done();
};

// Set up the server using proxyquire to control all imports
const serverPath = path.resolve(__dirname, '../server.js');
const server = proxyquire(serverPath, {
  './db': dbMock,
  '@fastify/jwt': mockJwt,
  '@fastify/oauth2': oauthMock,
  './routes/auth': mockAuth,
  'dotenv': {
    config: () => {}
  }
});

// Optional: Replace googleOAuthHandler with a simpler version for testing
const googleHandlerPath = path.resolve(__dirname, '../handlers/google');
proxyquire(googleHandlerPath, {
  '../db': dbMock
});

/**
 * Test 1: GET / (homepage) without token
 */
t.test('GET / returns welcome message for guests', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/'
  });
  
  t.equal(response.statusCode, 200, 'Status code should be 200 OK');
  const payload = JSON.parse(response.payload);
  t.match(payload.message, /Guest/, 'Should welcome guests');
});

/**
 * Test 2: GET / with a token in query params
 */
t.test('GET / with token returns personalized welcome message', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/?access_token=mock.jwt.token'
  });
  
  t.equal(response.statusCode, 200, 'Status code should be 200 OK');
  const payload = JSON.parse(response.payload);
  t.match(payload.message, /Welcome/, 'Should contain welcome message');
});

/**
 * Test 3: GET /oauth2/google/callback
 */
t.test('GET /oauth2/google/callback redirects with token', async t => {
  const response = await server.inject({
    method: 'GET',
    url: '/oauth2/google/callback',
    query: { code: 'mock_auth_code' }
  });
  
  t.equal(response.statusCode, 302, 'Status code should be 302 (redirect)');
  const location = response.headers.location;
  t.match(location, /\?access_token=/, 'Redirect URL should contain access token');
});

// Clean up
t.teardown(async () => {
  delete global.fetch;
  await server.close();
});