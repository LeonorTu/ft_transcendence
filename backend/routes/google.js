const { googleOAuthHandler } = require('../handlers/google')

function googleRoutes(fastify, options, done) {
  // Register OAuth2 with Google configuration
  fastify.register(require('@fastify/oauth2'), {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET
      },
      auth: {
        authorizeHost: 'https://accounts.google.com',
        authorizePath: '/o/oauth2/v2/auth',
        tokenHost: 'https://www.googleapis.com',
        tokenPath: '/oauth2/v4/token'
      }
    },
    scope: ['profile', 'email'],
    startRedirectPath: '/oauth2/google/',
    callbackUri: 'http://localhost:8888/oauth2/google/callback'
  })

  // Callback route
  fastify.get('/oauth2/google/callback', googleOAuthHandler)
  
  // Add a route for the root path with access_token
  fastify.get('/', async (request, reply) => {
    const { access_token, error } = request.query;
    
    if (error) {
      // Handle authentication errors
      return reply.send({ 
        message: 'Authentication failed', 
        error: error 
      });
    }
    
    if (access_token) {
      // Handle successful authentication
      try {
        // You can verify the token if needed
        const decoded = fastify.jwt.verify(access_token);
        return reply.send({ 
          message: 'Authentication successful',
          user: {
            id: decoded.id,
            email: decoded.email
          }
        });
      } catch (err) {
        return reply.send({ 
          message: 'Invalid token', 
          error: err.message 
        });
      }
    }
    
    // Regular homepage
    return reply.send({ message: 'Welcome to the homepage' });
  });
  
  done();
}

module.exports = googleRoutes