import Stripe from 'stripe';

let connectionSettings: any;
let cachedStripeClient: Stripe | null = null;
let cachedPublishableKey: string | null = null;
let cachedSecretKey: string | null = null;

/**
 * Gets Stripe API credentials from either Replit Connectors or environment variables
 * Supports both Replit hosting and standard .env configuration
 */
async function getCredentials() {
  // Try to get from environment variables first (standard setup)
  const envSecretKey = process.env.STRIPE_SECRET_KEY;
  const envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (envSecretKey && envPublishableKey) {
    return {
      secretKey: envSecretKey,
      publishableKey: envPublishableKey,
    };
  }

  // Fall back to Replit Connectors if env vars not set
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error(
      'Stripe credentials not found. Please set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables, ' +
      'or configure Stripe in Replit Connectors.'
    );
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not configured in Replit Connectors`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

/**
 * Get a Stripe client instance (cached for reuse)
 */
export async function getStripeClient() {
  if (cachedStripeClient) {
    return cachedStripeClient;
  }

  const { secretKey } = await getCredentials();
  cachedSecretKey = secretKey;

  cachedStripeClient = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });

  return cachedStripeClient;
}

/**
 * Get a fresh Stripe client instance (not cached)
 * Useful for avoiding stale instances in some scenarios
 */
export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

/**
 * Get Stripe publishable key for frontend integration
 */
export async function getStripePublishableKey() {
  if (cachedPublishableKey) {
    return cachedPublishableKey;
  }

  const { publishableKey } = await getCredentials();
  cachedPublishableKey = publishableKey;

  return publishableKey;
}

/**
 * Get Stripe secret key
 */
export async function getStripeSecretKey() {
  if (cachedSecretKey) {
    return cachedSecretKey;
  }

  const { secretKey } = await getCredentials();
  cachedSecretKey = secretKey;

  return secretKey;
}

let stripeSync: any = null;

/**
 * Get StripeSync instance for database syncing
 * Only available if stripe-replit-sync package is installed
 */
export async function getStripeSync() {
  if (stripeSync) {
    return stripeSync;
  }

  try {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });

    return stripeSync;
  } catch (error) {
    console.warn('StripeSync not available. Install stripe-replit-sync for database syncing.');
    return null;
  }
}
