import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import openApiSpecBase from './openapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routesDir = join(__dirname, '../routes');
const routeFiles = readdirSync(routesDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => join(routesDir, file));

const definition = {
  openapi: openApiSpecBase.openapi || '3.0.3',
  info: openApiSpecBase.info,
  servers: openApiSpecBase.servers,
  tags: openApiSpecBase.tags,
  components: openApiSpecBase.components,
};

const openApiSpec = swaggerJsdoc({
  definition,
  apis: routeFiles,
});

/**
 * Mount OpenAPI JSON + Swagger UI (same paths as reference project).
 * - UI:  /swagger-ui/index.html
 * - JSON: /v3/api-docs
 */
export function mountSwagger(app) {
  app.get('/v3/api-docs', (req, res) => {
    res.status(200).json(openApiSpec);
  });

  const opts = {
    customSiteTitle: 'Rental Booking API',
    swaggerUrl: '/v3/api-docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      url: '/v3/api-docs',
    },
  };

  const setup = swaggerUi.setup(openApiSpec, opts);

  app.get('/swagger-ui/index.html', setup);
  app.get('/swagger-ui/', setup);
  app.get('/swagger-ui', (req, res) => {
    res.redirect(302, '/swagger-ui/index.html');
  });

  app.use('/swagger-ui', swaggerUi.serve);
}

export { openApiSpec };
export default mountSwagger;
