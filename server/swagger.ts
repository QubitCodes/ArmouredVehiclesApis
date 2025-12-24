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
        UserProfile: {
          type: 'object',
          description: 'User profile with all onboarding steps data',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'string' },
            typeOfBuyer: { 
              type: 'string',
              enum: ['individual', 'business', 'government', 'reseller', 'manufacturer', 'distributor', 'other'],
              description: 'Type of buyer/user'
            },
            complianceRegistration: { 
              type: 'string',
              description: 'Compliance registration document URL (supports jpeg, png, pdf, mp4 formats)'
            },
            country: { type: 'string' },
            companyName: { type: 'string' },
            companyEmail: { type: 'string' },
            companyPhone: { type: 'string' },
            companyPhoneCountryCode: { type: 'string' },
            countryOfRegistration: { type: 'string' },
            registeredCompanyName: { type: 'string' },
            tradeBrandName: { type: 'string' },
            yearOfEstablishment: { type: 'integer' },
            legalEntityId: { type: 'string' },
            legalEntityIssueDate: { type: 'string' },
            legalEntityExpiryDate: { type: 'string' },
            cityOfficeAddress: { type: 'string' },
            officialWebsite: { type: 'string' },
            entityType: { type: 'string', enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'importer', 'exporter', 'other'] },
            contactFullName: { type: 'string' },
            contactJobTitle: { type: 'string' },
            contactWorkEmail: { type: 'string' },
            contactMobile: { type: 'string' },
            termsAccepted: { type: 'boolean' },
            natureOfBusiness: { type: 'array', items: { type: 'string' } },
            endUseMarkets: { type: 'array', items: { type: 'string' } },
            operatingCountries: { type: 'array', items: { type: 'string' } },
            sellingCategories: { type: 'array', items: { type: 'string' } },
            preferredCurrency: { type: 'string' },
            sponsorContent: { type: 'boolean' },
            paymentMethod: { type: 'string' },
            financialInstitution: { type: 'string' },
            swiftCode: { type: 'string' },
            bankAccountNumber: { type: 'string' },
            verificationMethod: { type: 'string' },
            onboardingStatus: { type: 'string', enum: ['pending', 'in_progress', 'pending_verification', 'under_review', 'approved', 'rejected'] },
            currentStep: { type: 'integer', minimum: 0, maximum: 6 },
            submittedForApproval: { type: 'boolean' },
            submittedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        VendorProduct: {
          type: 'object',
          description: 'Complete vendor product with all tabs data',
          properties: {
            id: { type: 'integer' },
            vendorId: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'pending_review', 'approved', 'rejected', 'suspended'] },
            // Tab 1: Basic Information
            name: { type: 'string', description: 'Product name' },
            sku: { type: 'string', description: 'Stock Keeping Unit' },
            mainCategoryId: { type: 'integer', nullable: true },
            categoryId: { type: 'integer', nullable: true },
            subCategoryId: { type: 'integer', nullable: true },
            vehicleCompatibility: { type: 'string', nullable: true, description: 'Compatible vehicle models' },
            certifications: { type: 'string', nullable: true, description: 'Product certifications' },
            countryOfOrigin: { type: 'string', nullable: true },
            controlledItemType: { type: 'string', nullable: true },
            // Tab 2: Technical Description - Specifications
            dimensionLength: { type: 'number', nullable: true },
            dimensionWidth: { type: 'number', nullable: true },
            dimensionHeight: { type: 'number', nullable: true },
            dimensionUnit: { type: 'string', nullable: true },
            materials: { type: 'array', items: { type: 'string' }, nullable: true },
            features: { type: 'array', items: { type: 'string' }, nullable: true },
            performance: { type: 'array', items: { type: 'string' }, nullable: true },
            technicalDescription: { type: 'string', nullable: true },
            // Tab 2: Available Variants
            driveTypes: { type: 'array', items: { type: 'string' }, nullable: true },
            sizes: { type: 'array', items: { type: 'string' }, nullable: true },
            thickness: { type: 'array', items: { type: 'string' }, nullable: true },
            colors: { type: 'array', items: { type: 'string' }, nullable: true },
            weightValue: { type: 'number', nullable: true },
            weightUnit: { type: 'string', nullable: true },
            packingLength: { type: 'number', nullable: true },
            packingWidth: { type: 'number', nullable: true },
            packingHeight: { type: 'number', nullable: true },
            packingDimensionUnit: { type: 'string', nullable: true },
            packingWeight: { type: 'number', nullable: true },
            packingWeightUnit: { type: 'string', nullable: true },
            minOrderQuantity: { type: 'integer', nullable: true },
            // Tab 3: Pricing & Availability
            basePrice: { type: 'number', nullable: true },
            currency: { type: 'string', default: 'USD' },
            pricingTerms: { type: 'array', items: { type: 'string' }, nullable: true },
            productionLeadTime: { type: 'integer', nullable: true, description: 'Lead time in days' },
            readyStockAvailable: { type: 'boolean', default: false },
            stock: { type: 'integer', default: 0 },
            // Tab 5: Compliance & Declarations
            manufacturingSource: { type: 'string', nullable: true },
            manufacturingSourceName: { type: 'string', nullable: true },
            requiresExportLicense: { type: 'boolean', default: false },
            hasWarranty: { type: 'boolean', default: false },
            warrantyDuration: { type: 'integer', nullable: true },
            warrantyDurationUnit: { type: 'string', nullable: true },
            warrantyTerms: { type: 'string', nullable: true },
            complianceConfirmed: { type: 'boolean', default: false },
            supplierSignature: { type: 'string', nullable: true },
            submissionDate: { type: 'string', format: 'date-time', nullable: true },
            // Legacy/computed fields
            price: { type: 'number', nullable: true },
            originalPrice: { type: 'number', nullable: true },
            image: { type: 'string', nullable: true },
            gallery: { type: 'array', items: { type: 'string' }, nullable: true },
            description: { type: 'string', nullable: true },
            condition: { type: 'string', enum: ['new', 'used', 'refurbished'], default: 'new' },
            make: { type: 'string', nullable: true },
            model: { type: 'string', nullable: true },
            year: { type: 'integer', nullable: true },
            rating: { type: 'number', nullable: true },
            reviewCount: { type: 'integer', default: 0 },
            specifications: { type: 'string', nullable: true },
            vehicleFitment: { type: 'string', nullable: true },
            warranty: { type: 'string', nullable: true },
            actionType: { type: 'string', default: 'buy_now' },
            isFeatured: { type: 'boolean', default: false },
            // Admin review fields
            reviewedBy: { type: 'string', nullable: true },
            reviewedAt: { type: 'string', format: 'date-time', nullable: true },
            reviewNote: { type: 'string', nullable: true },
            rejectionReason: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        VendorProductInput: {
          type: 'object',
          description: 'Input for creating/updating vendor products',
          properties: {
            // Tab 1: Basic Information
            name: { type: 'string', example: 'Armored Door Panel - Level 4' },
            sku: { type: 'string', example: 'ADP-L4-2024' },
            mainCategoryId: { type: 'integer', example: 1 },
            categoryId: { type: 'integer', example: 5 },
            subCategoryId: { type: 'integer', example: 12 },
            vehicleCompatibility: { type: 'string', example: 'Land Cruiser 200 Series (2008-2021), G-Class (2018+)' },
            certifications: { type: 'string', example: 'NIJ Level IV, VPAM BRV 2009' },
            countryOfOrigin: { type: 'string', example: 'USA' },
            controlledItemType: { type: 'string', example: 'Ballistic Protection' },
            // Tab 2: Technical Description
            dimensionLength: { type: 'number', example: 120.5 },
            dimensionWidth: { type: 'number', example: 80.3 },
            dimensionHeight: { type: 'number', example: 5.2 },
            dimensionUnit: { type: 'string', example: 'cm' },
            materials: { type: 'array', items: { type: 'string' }, example: ['Hardened Steel', 'Kevlar Composite', 'Ceramic Plates'] },
            features: { type: 'array', items: { type: 'string' }, example: ['Blast Resistant', 'Corrosion Protected', 'Lightweight Design'] },
            performance: { type: 'array', items: { type: 'string' }, example: ['Stops 7.62x51mm NATO', 'Multi-hit Capable', 'Fragmentation Protection'] },
            technicalDescription: { type: 'string', example: 'Advanced composite armor door panel designed for high-threat environments...' },
            // Tab 2: Variants
            driveTypes: { type: 'array', items: { type: 'string' }, example: ['4WD', 'AWD'] },
            sizes: { type: 'array', items: { type: 'string' }, example: ['Standard', 'Extended'] },
            thickness: { type: 'array', items: { type: 'string' }, example: ['25mm', '30mm', '35mm'] },
            colors: { type: 'array', items: { type: 'string' }, example: ['Black', 'Gray', 'Tan'] },
            weightValue: { type: 'number', example: 45.5 },
            weightUnit: { type: 'string', example: 'kg' },
            packingLength: { type: 'number', example: 130 },
            packingWidth: { type: 'number', example: 90 },
            packingHeight: { type: 'number', example: 15 },
            packingDimensionUnit: { type: 'string', example: 'cm' },
            packingWeight: { type: 'number', example: 50 },
            packingWeightUnit: { type: 'string', example: 'kg' },
            minOrderQuantity: { type: 'integer', example: 2 },
            // Tab 3: Pricing & Availability
            basePrice: { type: 'number', example: 4599.99 },
            currency: { type: 'string', example: 'USD' },
            pricingTerms: { type: 'array', items: { type: 'string' }, example: ['FOB', 'CIF', 'EXW'] },
            productionLeadTime: { type: 'integer', example: 45, description: 'Days' },
            readyStockAvailable: { type: 'boolean', example: true },
            stock: { type: 'integer', example: 25 },
            // Tab 5: Compliance
            manufacturingSource: { type: 'string', example: 'OEM' },
            manufacturingSourceName: { type: 'string', example: 'ArmorTech Industries' },
            requiresExportLicense: { type: 'boolean', example: true },
            hasWarranty: { type: 'boolean', example: true },
            warrantyDuration: { type: 'integer', example: 24 },
            warrantyDurationUnit: { type: 'string', example: 'months' },
            warrantyTerms: { type: 'string', example: 'Full coverage against manufacturing defects. Installation warranty separate.' },
            complianceConfirmed: { type: 'boolean', example: true },
            supplierSignature: { type: 'string', example: 'John Doe - 2024-12-23' },
            // Legacy fields
            description: { type: 'string', example: 'Premium armored door panel for military and VIP vehicles' },
            condition: { type: 'string', enum: ['new', 'used', 'refurbished'], example: 'new' },
            make: { type: 'string', example: 'Toyota' },
            model: { type: 'string', example: 'Land Cruiser' },
            year: { type: 'integer', example: 2024 },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints - Used by Login/Register pages' },
      { name: 'Auth - OTP', description: 'OTP-based authentication for email and phone verification' },
      { name: 'Products', description: 'Product catalog and search - Used by Home, Products, Product Details pages' },
      { name: 'Categories', description: 'Product categories - Used by Home page and navigation' },
      { name: 'Cart', description: 'Shopping cart operations - Used by Cart page, Product Details, Navbar' },
      { name: 'Checkout', description: 'Payment processing with Stripe - Used by Checkout page' },
      { name: 'Orders', description: 'Order management - Used by Profile page' },
      { name: 'Reviews', description: 'Product reviews - Used by Product Details page' },
      { name: 'Vendor', description: 'Vendor dashboard operations - Used by Seller Dashboard' },
      { name: 'Vendor - Onboarding', description: 'Multi-step vendor onboarding flow (Steps 0-5 + Identity Verification)' },
      { name: 'Vendor Products', description: 'Vendor product creation, management and submission for review' },
      { name: 'Reference Data', description: 'Dropdown values for forms (countries, currencies, banks, categories, etc.)' },
      { name: 'Filters', description: 'Product filter options - Used by Products page' },
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
  
  // Alias /api/doc to redirect to /api/docs
  app.get('/api/doc', (req, res) => {
    res.redirect('/api/docs');
  });
  
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
