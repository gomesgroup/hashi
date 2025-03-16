import swaggerJSDoc from 'swagger-jsdoc';
import config from './index';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ChimeraX Web Integration API',
    version: '1.0.0',
    description: 'API documentation for web application integrating with UCSF ChimeraX',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'Gomes Group',
      url: 'https://github.com/gomesgroup',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.server.port}/api`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'User ID for authentication (temporary, will be replaced with JWT)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error',
          },
          code: {
            type: 'string',
            example: 'INTERNAL_SERVER_ERROR',
          },
          message: {
            type: 'string',
            example: 'An error occurred',
          },
          details: {
            type: 'object',
            example: null,
          },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          created: {
            type: 'string',
            format: 'date-time',
          },
          lastActive: {
            type: 'string',
            format: 'date-time',
          },
          port: {
            type: 'integer',
          },
          status: {
            type: 'string',
            enum: ['initializing', 'ready', 'busy', 'error', 'terminated'],
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Sessions',
      description: 'API endpoints for managing ChimeraX sessions',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/server/routes/*.ts'], // Path to the API routes files
};

export default swaggerJSDoc(options);