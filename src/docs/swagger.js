const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { env } = require('../config/env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express REST API',
      version: '1.0.0',
      description: 'Documentation de l’API',
    },
    servers: [
      { url: `http://localhost:${env.PORT || 3000}/api` }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['src/routes/*.js']
};

function initSwagger(app) {
  if (!env.SWAGGER_ENABLED) return;
  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}

module.exports = initSwagger;

