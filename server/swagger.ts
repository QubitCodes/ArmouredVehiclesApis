import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ArmoredMart API',
      version: '1.0.0',
      description: 'B2B Marketplace API for Defense and Military Vehicle Parts',
      contact: {
        name: 'ArmoredMart Support',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            userType: { type: 'string', enum: ['customer', 'vendor', 'admin', 'super_admin'] },
            avatar: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            sku: { type: 'string' },
            price: { type: 'string' },
            image: { type: 'string' },
            categoryId: { type: 'integer' },
            description: { type: 'string' },
            condition: { type: 'string', enum: ['new', 'used', 'refurbished'] },
            stock: { type: 'integer' },
            make: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'integer' },
            rating: { type: 'string', nullable: true },
            reviewCount: { type: 'integer' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            image: { type: 'string' },
            description: { type: 'string', nullable: true },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'string' },
            productId: { type: 'integer' },
            quantity: { type: 'integer' },
            product: { $ref: '#/components/schemas/Product' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] },
            total: { type: 'string' },
            trackingNumber: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            productId: { type: 'integer' },
            userId: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
            verifiedPurchase: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Products', description: 'Product management' },
      { name: 'Categories', description: 'Category management' },
      { name: 'Cart', description: 'Shopping cart operations' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Reviews', description: 'Product reviews' },
      { name: 'Vendor', description: 'Vendor-specific operations' },
    ],
  },
  apis: ['./server/routes.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ArmoredMart API Documentation',
  }));
  
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
