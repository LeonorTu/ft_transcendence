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
    startRedirectPath: '/oauth2/google',
    callbackUri: 'http://localhost:8888/oauth2/google/callback'
  })

  // Callback route
  fastify.get('/oauth2/google/callback', googleOAuthHandler)
  
  done()
}

module.exports = googleRoutes