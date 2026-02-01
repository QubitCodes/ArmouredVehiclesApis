import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Armoured Vehicles API',
        version: '1.0.0',
        description: 'API Documentation for Armoured Vehicles E-commerce Platform',
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          // === Standard Response ===
          ApiResponse: {
            type: 'object',
            properties: {
              status: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Operation successful' },
              code: { type: 'integer', example: 100 },
              data: { type: 'object' },
              misc: { type: 'object' },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              page: { type: 'integer' },
              pages: { type: 'integer' },
              limit: { type: 'integer' },
            },
          },
          // === User & Profile ===
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              country_code: { type: 'string' },
              avatar: { type: 'string' },
              user_type: { type: 'string', enum: ['customer', 'vendor', 'admin'] },
              is_active: { type: 'boolean' },
              email_verified: { type: 'boolean' },
              phone_verified: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          Profile: {
            type: 'object',
            properties: {
              company_name: { type: 'string' },
              company_email: { type: 'string' },
              company_phone: { type: 'string' },
              company_website: { type: 'string' },
              contact_person_name: { type: 'string' },
              contact_person_phone: { type: 'string' },
              contact_person_email: { type: 'string' },
              address_line1: { type: 'string' },
              address_line2: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
              postal_code: { type: 'string' },
              onboarding_status: { type: 'string', enum: ['not_started', 'in_progress', 'pending_verification', 'approved', 'rejected', 'update_needed'] },
              govt_compliance_reg_url: { type: 'string' },
              business_license_url: { type: 'string' },
              vat_certificate_url: { type: 'string' },
              company_profile_url: { type: 'string' },
            },
          },
          Vendor: {
            allOf: [
              { $ref: '#/components/schemas/User' },
              { type: 'object', properties: { profile: { $ref: '#/components/schemas/Profile' } } }
            ]
          },
          // === Address ===
          Address: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              user_id: { type: 'string', format: 'uuid' },
              label: { type: 'string' },
              full_name: { type: 'string' },
              phone: { type: 'string' },
              phone_country_code: { type: 'string' },
              address_line1: { type: 'string' },
              address_line2: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              postal_code: { type: 'string' },
              country: { type: 'string' },
              is_default: { type: 'boolean' },
            },
          },
          // === Category ===
          Category: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              slug: { type: 'string' },
              image: { type: 'string' },
              description: { type: 'string' },
              is_controlled: { type: 'boolean' },
              parent_id: { type: 'integer' },
              children: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
            },
          },
          // === Product ===
          Product: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              vendor_id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              sku: { type: 'string' },
              description: { type: 'string' },
              base_price: { type: 'number' },
              sale_price: { type: 'number' },
              status: { type: 'string', enum: ['draft', 'published', 'pending_review', 'approved', 'rejected', 'suspended'] },
              condition: { type: 'string', enum: ['new', 'used', 'refurbished'] },
              stock: { type: 'integer' },
              category_id: { type: 'integer' },
              main_category_id: { type: 'integer' },
              is_controlled: { type: 'boolean' },
              image: { type: 'string' },
              gallery: { type: 'array', items: { type: 'string' } },
              media: { type: 'array', items: { $ref: '#/components/schemas/ProductMedia' } },
              category: { $ref: '#/components/schemas/Category' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          ProductMedia: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              product_id: { type: 'integer' },
              type: { type: 'string', enum: ['image', 'video', 'document'] },
              url: { type: 'string' },
              file_name: { type: 'string' },
              is_cover: { type: 'boolean' },
              display_order: { type: 'integer' },
            },
          },
          // === Order ===
          Order: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              order_id: { type: 'string' },
              order_group_id: { type: 'string' },
              user_id: { type: 'string', format: 'uuid' },
              vendor_id: { type: 'string', format: 'uuid' },
              total_amount: { type: 'number' },
              currency: { type: 'string' },
              type: { type: 'string', enum: ['direct', 'request'] },
              order_status: { type: 'string', enum: ['order_received', 'vendor_approved', 'vendor_rejected', 'approved', 'rejected', 'cancelled'] },
              payment_status: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
              shipment_status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'] },
              comments: { type: 'string' },
              tracking_number: { type: 'string' },
              items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          OrderItem: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              order_id: { type: 'string', format: 'uuid' },
              product_id: { type: 'integer' },
              vendor_id: { type: 'string', format: 'uuid' },
              quantity: { type: 'integer' },
              price: { type: 'number' },
              product_name: { type: 'string' },
              product: { $ref: '#/components/schemas/Product' },
            },
          },
          // === Cart ===
          Cart: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              user_id: { type: 'string', format: 'uuid' },
              session_id: { type: 'string' },
              status: { type: 'string', enum: ['active', 'abandoned', 'converted'] },
              items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
              total: { type: 'number' },
            },
          },
          CartItem: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              cart_id: { type: 'string', format: 'uuid' },
              product_id: { type: 'integer' },
              quantity: { type: 'integer' },
              product: { $ref: '#/components/schemas/Product' },
            },
          },
          // === Wishlist ===
          Wishlist: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              user_id: { type: 'string', format: 'uuid' },
              items: { type: 'array', items: { $ref: '#/components/schemas/WishlistItem' } },
            },
          },
          WishlistItem: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              wishlist_id: { type: 'string', format: 'uuid' },
              product_id: { type: 'integer' },
              product: { $ref: '#/components/schemas/Product' },
            },
          },
          // === Review ===
          Review: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              product_id: { type: 'integer' },
              user_id: { type: 'string', format: 'uuid' },
              rating: { type: 'integer', minimum: 1, maximum: 5 },
              title: { type: 'string' },
              content: { type: 'string' },
              verified_purchase: { type: 'boolean' },
              helpful_count: { type: 'integer' },
              images: { type: 'array', items: { type: 'string' } },
              user: { $ref: '#/components/schemas/User' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          // === Finance ===
          FinancialLog: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              user_id: { type: 'string', format: 'uuid' },
              type: { type: 'string', enum: ['credit', 'debit'] },
              category: { type: 'string', enum: ['sale', 'commission', 'withdrawal', 'refund', 'adjustment'] },
              amount: { type: 'number' },
              reference_id: { type: 'string' },
              description: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          PayoutRequest: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              user_id: { type: 'string', format: 'uuid' },
              amount: { type: 'number' },
              status: { type: 'string', enum: ['pending', 'approved', 'paid', 'rejected'] },
              admin_note: { type: 'string' },
              receipt: { type: 'string' },
              transaction_reference: { type: 'string' },
              approved_by: { type: 'string', format: 'uuid' },
              approved_at: { type: 'string', format: 'date-time' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          // === Dashboard SDUI ===
          DashboardWidget: {
            type: 'object',
            description: 'Server-Driven UI Widget for Dashboard',
            properties: {
              type: { type: 'string', example: 'stat_card', description: 'Widget type identifier' },
              width: { type: 'integer', example: 1, description: 'Grid column span (1-4)' },
              title: { type: 'string', example: 'Total Vendors', description: 'Widget title' },
              value: { oneOf: [{ type: 'string' }, { type: 'integer' }], example: 120, description: 'Primary value' },
              subValue: { type: 'string', example: '5 new this month', description: 'Secondary/sub value' },
              icon: { type: 'string', example: 'Store', description: 'Lucide icon name' },
              theme: { type: 'string', example: 'blue', description: 'Color theme key (e.g., blue, emerald, amber)' },
            },
          },
        },
      },
      security: [],
      tags: [
        { name: 'Auth', description: 'Authentication' },
        { name: 'Auth - OTP', description: 'OTP Verification' },
        { name: 'Onboarding', description: 'User Onboarding Flow' },
        { name: 'Profile', description: 'User Profile & Addresses' },
        { name: 'Reviews', description: 'Product Reviews' },
        { name: 'Categories', description: 'Product Categories' },
        { name: 'Products', description: 'Product Catalog' },
        { name: 'Cart', description: 'Shopping Cart' },
        { name: 'Wishlist', description: 'User Wishlist' },
        { name: 'Checkout', description: 'Order Placement' },
        { name: 'Admin', description: 'Platform Administration' },
        { name: 'Vendor', description: 'Vendor Dashboard & Management' },
        { name: 'Finance', description: 'Financial Logs & Withdrawals' },
      ],
    },
  });
  return spec;
};
