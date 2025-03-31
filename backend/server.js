const fs = require('fs')
const path = require('path')
const fastify = require('fastify')({
  logger: true,
  https: {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'ssl.key')), // to include in .env
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'ssl.cert')) // to include in .env
  }
})


fastify.register(import('@fastify/swagger'))

fastify.register(import('@fastify/swagger-ui'), {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  },
  uiHooks: {
    onRequest: function (request, reply, next) { next() },
    preHandler: function (request, reply, next) { next() }
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
  transformSpecificationClone: true
})

fastify.register(require('@fastify/jwt'), {
  secret: 'supersecret'
})

fastify.register(require('./routes/users'))

fastify.register(require('./routes/auth'))

const PORT = 8888

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Server listening on https://localhost:${PORT}`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

start()