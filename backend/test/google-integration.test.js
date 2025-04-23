/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   googele-integration.test.js                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: pmarkaid <pmarkaid@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/22 11:29:11 by pmarkaid          #+#    #+#             */
/*   Updated: 2025/04/23 14:29:22 by pmarkaid         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
const Fastify = require('fastify');
const proxyquire = require('proxyquire');
const path = require('path');

// Mock database for testing
const dbMock = {
  get: function(query, params, callback) {
    // First call - checking for existing user
    if (query.includes('SELECT * FROM users WHERE email = ?') && params[0] === 'existing@example.com') {
      callback(null, {
        id: 123,
        username: 'existingUser',
        email: 'existing@example.com',
        google_id: null,
        avatar: 'existingUser_default.png',
        online_status: 'offline'
      });
    } 
    // Testing for new user creation - username check
    else if (query.includes('SELECT id FROM users WHERE username = ?')) {
      // Simulate username "TestUser" exists, "TestUser1" doesn't
      if (params[0] === 'TestUser') {
        callback(null, { id: 100 });
      } else {
        callback(null, null);
      }
    } 
    // No user found with the email
    else if (query.includes('SELECT * FROM users WHERE email = ?')) {
      callback(null, null);
    }
    // Default response for any other query
    else {
      callback(null, null);
    }
  },
  run: function(query, params, callback) {
    // Mock successful DB operation
    if (typeof callback === 'function') {
      callback.call({ lastID: 999, changes: 1 });
    }
  },
  all: function(query, params, callback) {
    callback(null, []);
  }
};

// Create a mock for sharp
const sharpMock = function() {
  return {
    resize: function() {
      return {
        png: function() {
          return {
            toFile: function(path) {
              return Promise.resolve();
            }
          };
        }
      };
    }
  };
};

// Setup our test context with mocks
const setupTest = async () => {
  // Create a real fastify instance but with mocked components
  const fastify = Fastify({ 
    logger: false,
    ignoreTrailingSlash: true
  });

  // Register JWT plugin for token generation
  await fastify.register(require('@fastify/jwt'), {
    secret: 'test-secret-key'
  });
  
  // Add jwtDecode method
  fastify.decorate('jwtDecode', function(token) {
    try {
      return fastify.jwt.decode(token);
    } catch (err) {
      throw new Error('Invalid token format');
    }
  });

  // Add sendFile capability
  fastify.decorate('sendFile', function(filename) {
    return this.send({ file: filename });
  });

  // Mock the fetch function for Google API responses
  global.fetch = async (url, options) => {
    if (url.includes('dicebear')) {
      return {
        ok: true,
        text: async () => '<svg>Mock Avatar</svg>'
      };
    }
    
    if (url.includes('googleapis.com')) {
      return {
        ok: true,
        json: async () => {
          // Return different mock user data based on the test case
          if (options.headers.Authorization.includes('existing_user_token')) {
            return {
              id: 'google123',
              name: 'Existing User',
              email: 'existing@example.com',
              given_name: 'Existing'
            };
          } else {
            return {
              id: 'google456',
              name: 'TestUser',
              email: 'new@example.com',
              given_name: 'Test'
            };
          }
        }
      };
    }
    
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  // Import our handlers with mocked dependencies
  const { googleOAuthHandler } = proxyquire('../handlers/google', {
    '../db': dbMock,
    'sharp': sharpMock,
    'path': path
  });
  
  // Bind the handler to fastify
  fastify.decorate('googleOAuth2', {
    getAccessTokenFromAuthorizationCodeFlow: async (request) => {
      // Simulate different tokens based on test case
      if (request.query && request.query.case === 'existing') {
        return { token: { access_token: 'existing_user_token' } };
      } else {
        return { token: { access_token: 'new_user_token' } };
      }
    }
  });

  // Register routes
  fastify.get('/oauth2/google/callback', async function(request, reply) {
    return googleOAuthHandler.call(this, request, reply);
  });

  await fastify.ready();
  return fastify;
};

// Main test suite
t.test('Google Authentication Integration Tests', async t => {
  let fastify;
  
  // Set up fastify before tests
  t.beforeEach(async () => {
    fastify = await setupTest();
  });
  
  // Clean up after each test
  t.afterEach(async () => {
    await fastify.close();
    delete global.fetch;
  });

  // Test 1: Linking Google account to existing user
  t.test('Should link Google account to existing user with matching email', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth2/google/callback?case=existing',
      headers: {
        'accept': 'application/json'
      }
    });
    
    t.equal(response.statusCode, 302, 'Should redirect after successful authentication');
    const location = response.headers.location;
    t.match(location, /\?access_token=/, 'Redirect URL should contain JWT token');
    
    // Verify the token contains the correct user information
    const token = location.split('access_token=')[1];
    const decoded = fastify.jwt.decode(token);
    
    t.equal(decoded.id, 123, 'Token should contain existing user ID');
    t.equal(decoded.email, 'existing@example.com', 'Token should contain existing user email');
    t.equal(decoded.username, 'existingUser', 'Token should contain existing username');
  });

  // Test 2: Creating new user from Google login
  t.test('Should create a new user when Google email is not found', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth2/google/callback?case=new',
      headers: {
        'accept': 'application/json'
      }
    });
    
    t.equal(response.statusCode, 302, 'Should redirect after successful authentication');
    const location = response.headers.location;
    t.match(location, /\?access_token=/, 'Redirect URL should contain JWT token');
    
    // Verify the token contains the new user information
    const token = location.split('access_token=')[1];
    const decoded = fastify.jwt.decode(token);
    
    t.equal(decoded.id, 999, 'Token should contain new user ID');
    t.equal(decoded.email, 'new@example.com', 'Token should contain Google email');
    t.match(decoded.username, /TestUser/, 'Token should contain generated username');
  });

  // Test 3: Handle Google API errors
  t.test('Should redirect with error when Google API fails', async t => {
    // Override fetch for this test
    global.fetch = async () => {
      throw new Error('API error');
    };
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth2/google/callback'
    });
    
    t.equal(response.statusCode, 302, 'Should redirect on error');
    t.match(response.headers.location, /error=authentication_failed/, 'Should redirect with error param');
  });

  // Test 4: Handle username conflict during new user creation
  t.test('Should handle username conflicts during new user creation', async t => {
    // This test will create a new user with 'TestUser' name,
    // which our mock shows already exists, so it should append a number
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth2/google/callback?case=new'
    });
    
    t.equal(response.statusCode, 302, 'Should redirect after successful authentication');
    
    // Get the token and verify username has been adjusted
    const token = response.headers.location.split('access_token=')[1];
    const decoded = fastify.jwt.decode(token);
    
    t.not(decoded.username, 'TestUser', 'Username should not be the conflicting name');
    t.match(decoded.username, /TestUser1/, 'Username should have a number appended');
  });
});