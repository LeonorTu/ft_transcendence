module.exports = async function (fastify, opts) {
  fastify.get('/oauth2/google/callback', async (request, reply) => {
    // Mock implementation of the Google OAuth callback route
    const { code } = request.query;

    if (!code) {
      return reply.code(400).send({ error: 'Missing authorization code' });
    }

    // Simulate generating an access token and redirecting
    const accessToken = 'mock-access-token';
    reply.redirect(`/?access_token=${accessToken}`);
  });

  fastify.get('/', async (request, reply) => {
    // Mock implementation of the home route
    const { access_token } = request.query;

    if (access_token === 'mock-access-token') {
      return reply.send({ message: 'Welcome to the homepage' });
    }

    return reply.code(401).send({ error: 'Unauthorized' });
  });
};
