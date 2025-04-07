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

  const db = require('../db')
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
	  try {
		// Verify token
		const decoded = fastify.jwt.verify(access_token);
		
		// Fetch user details from database
		const user = await new Promise((resolve, reject) => {
		  db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, row) => {
			if (err) return reject(err);
			resolve(row);
		  });
		});
		
		if (!user) {
		  return reply.send({
			message: 'User not found in database',
			error: 'User record missing'
		  });
		}
		
		// Return welcome message with username
		return reply.send({ 
		  message: `Welcome to the homepage, ${user.username}!`
		});
	  } catch (err) {
		request.log.error(`Error processing homepage with token: ${err.message}`);
		return reply.send({ 
		  message: 'Invalid token or database error', 
		  error: err.message 
		});
	  }
	}
	
	// Regular homepage (no token in URL)
	return reply.send({ 
	  message: 'Welcome to the homepage, Guest!',
	  authenticated: false
	});
  });
  
  done();
}

module.exports = googleRoutes