/**
 * Environment Validation Script
 * Run this on application startup to ensure all security requirements are met
 * Place in: /lib/validate-env.js
 */

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // CRITICAL: Check required environment variables
  const required = {
    'JWT_SECRET': {
      minLength: 32,
      description: 'Secret key for JWT token signing'
    },
    'APP_PASSWORD': {
      minLength: 12,
      description: 'Application access password'
    },
    'SUPABASE_SERVICE_ROLE_KEY': {
      minLength: 20,
      description: 'Supabase service role key (admin access)'
    },
    'NEXT_PUBLIC_SUPABASE_URL': {
      minLength: 10,
      description: 'Supabase project URL'
    }
  };

  // Check each required variable
  for (const [key, config] of Object.entries(required)) {
    const value = process.env[key];
    
    if (!value) {
      errors.push(`❌ CRITICAL: ${key} is not set. ${config.description}`);
      continue;
    }
    
    if (value.length < config.minLength) {
      errors.push(`❌ CRITICAL: ${key} is too short (minimum ${config.minLength} characters). ${config.description}`);
    }
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    const secret = process.env.JWT_SECRET;
    
    // Check for weak secrets
    const weakSecrets = [
      'fallback-secret-for-dev',
      'secret',
      'password',
      '123456',
      'changeme',
      'default'
    ];
    
    if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
      errors.push('❌ CRITICAL: JWT_SECRET contains weak/default value');
    }
    
    // Check entropy
    const uniqueChars = new Set(secret.split('')).size;
    if (uniqueChars < 16) {
      warnings.push('⚠️  WARNING: JWT_SECRET has low entropy (few unique characters)');
    }
  }

  // Validate APP_PASSWORD strength
  if (process.env.APP_PASSWORD) {
    const password = process.env.APP_PASSWORD;
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecial)) {
      warnings.push('⚠️  WARNING: APP_PASSWORD should contain uppercase, lowercase, numbers, and special characters');
    }
  }

  // Validate Supabase keys
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Check if accidentally using anon key
    if (key.includes('anon') || key.length < 100) {
      errors.push('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY appears to be an anon key, not a service role key');
    }
  }

  // Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Running in PRODUCTION mode');
    
    // Additional production checks
    if (process.env.JWT_SECRET === process.env.APP_PASSWORD) {
      errors.push('❌ CRITICAL: JWT_SECRET and APP_PASSWORD must be different in production');
    }
  } else {
    warnings.push('ℹ️  Running in DEVELOPMENT mode');
  }

  // Report results
  console.log('\n=== Environment Validation ===\n');

  if (errors.length > 0) {
    console.error('🚨 CRITICAL ERRORS - Application will not start:\n');
    errors.forEach(err => console.error(err));
    console.error('\nPlease fix these issues before running the application.\n');
    throw new Error('Environment validation failed');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  WARNINGS:\n');
    warnings.forEach(warn => console.warn(warn));
    console.warn('\nThe application will start, but please address these warnings.\n');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables validated successfully\n');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate strong random secrets for environment variables
 */
export function generateSecrets() {
  const crypto = require('crypto');
  
  const jwtSecret = crypto.randomBytes(32).toString('base64');
  const appPassword = crypto.randomBytes(24).toString('base64');
  
  console.log('\n=== Generated Secrets ===\n');
  console.log('Add these to your .env file:\n');
  console.log(`JWT_SECRET="${jwtSecret}"`);
  console.log(`APP_PASSWORD="${appPassword}"`);
  console.log('\n⚠️  IMPORTANT: Keep these secrets secure and never commit them to version control!\n');
  
  return { jwtSecret, appPassword };
}

// Auto-run validation if this file is executed directly
if (require.main === module) {
  validateEnvironment();
}
