/**
 * OpenAPI 3 definition shell for Rental Booking API.
 * Path operations are documented as @swagger JSDoc in routes/*.js
 */

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Rental Booking API',
    description:
      'Simple rental house booking backend.\n\n## Authentication\nSend `Authorization: Bearer <JWT>` obtained from `/api/auth/login` or `/api/auth/register`.\n\nJWT payload includes `id` and `role` (`admin` or `user`).\n\nPublic registration always creates `role: user`. Admin accounts are not creatable via register.',
    version: '1.0.0',
  },
  servers: [
    {
      url: '/',
      description: 'Current host',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health check' },
    { name: 'Auth', description: 'Registration and login' },
    { name: 'Users', description: 'User profile' },
    { name: 'Properties', description: 'Property listing and management' },
    { name: 'Property Images', description: 'URL-based property images' },
    { name: 'Amenities', description: 'Amenities catalog and assignment' },
    { name: 'Bookings', description: 'Customer and owner bookings' },
    { name: 'Owner', description: 'Owner dashboard' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from login/register',
      },
    },
    schemas: {
      SuccessMessage: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {},
        },
      },
      ErrorMessage: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
        },
      },
    },
  },
  paths: {},
};

export default openApiSpec;
