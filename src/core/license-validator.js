#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Commercial License Validation System
 * Enforces proper licensing for commercial usage
 * 
 * @author Jordan After Midnight (concept and architecture)
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class LicenseValidator {
  constructor() {
    this.licensePubKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyX8f9V2J3K4Q8N7P5H9R
2M6T1L3W8E4Y7B6C9Z5X2J1K8R4N3P6Q7M9T5L2W1E8Y4B7C6Z9X5J2K1R8N4P3Q
6M7T9L5W2E1Y8B4C7Z6X9J5K2R1N8P4Q3M6T7L9W5E2Y1B8C4Z7X6J9K5R2N1P8Q
4M3T6L7W9E5Y2B1C8Z4X7J6K9R5N2P1Q8M4T3L6W7E9Y5B2C1Z8X4J7K6R9N5P2Q
1M8T4L3W6E7Y9B5C2Z1X8J4K7R6N9P5Q2M1T8L4W3E6Y7B9C5Z2X1J8K4R7N6P9Q
5M2T1L8W4E3Y6B7C9Z5X2J1K8R4N7P6Q9M5T2L1W8E4Y3B6C7Z9X5J2K1R8N4P3Q
6M7T9L5W2E1Y8B4C7Z6X9J5K2R1N8P4Q3M6T7L9W5E2Y1B8C4Z7X6J9K5R2N1P8Q
4M3T6L7W9E5Y2B1C8Z4X7J6K9R5N2P1Q8M4T3L6W7E9Y5B2C1Z8X4J7K6R9N5P2Q
QIDAQAB
-----END PUBLIC KEY-----`;

    this.trialPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    this.maxPersonalRequests = 1000; // Monthly limit for personal use
  }

  /**
   * Validate commercial license key
   */
  validateLicenseKey(licenseKey) {
    if (!licenseKey) {
      return { valid: false, reason: 'No license key provided' };
    }

    try {
      // Decode base64 license
      const decoded = Buffer.from(licenseKey, 'base64').toString();
      const licenseData = JSON.parse(decoded);

      // Verify required fields
      if (!licenseData.email || !licenseData.type || !licenseData.expires || !licenseData.signature) {
        return { valid: false, reason: 'Invalid license format' };
      }

      // Check expiration
      if (new Date(licenseData.expires) < new Date()) {
        return { valid: false, reason: 'License expired' };
      }

      // Verify signature (in production, use actual RSA verification)
      const expectedSig = this.generateLicenseSignature(licenseData);
      if (licenseData.signature !== expectedSig) {
        return { valid: false, reason: 'Invalid license signature' };
      }

      return {
        valid: true,
        data: licenseData,
        type: licenseData.type,
        email: licenseData.email,
        expires: licenseData.expires
      };

    } catch (error) {
      return { valid: false, reason: 'License parsing error' };
    }
  }

  /**
   * Generate license signature (placeholder for actual RSA signing)
   */
  generateLicenseSignature(licenseData) {
    const payload = `${licenseData.email}:${licenseData.type}:${licenseData.expires}`;
    return crypto.createHash('sha256').update(payload + 'iris-secret-key').digest('hex');
  }

  /**
   * Check usage limits for personal license
   */
  checkUsageLimits() {
    const usageFile = path.join(process.cwd(), '.usage-data');
    
    try {
      let usage = { requests: 0, lastReset: Date.now() };
      
      if (fs.existsSync(usageFile)) {
        usage = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      }

      // Reset monthly counter
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - usage.lastReset > oneMonth) {
        usage = { requests: 0, lastReset: Date.now() };
      }

      // Check limits
      if (usage.requests >= this.maxPersonalRequests) {
        return {
          exceeded: true,
          current: usage.requests,
          limit: this.maxPersonalRequests,
          resetDate: new Date(usage.lastReset + oneMonth)
        };
      }

      // Increment and save
      usage.requests++;
      fs.writeFileSync(usageFile, JSON.stringify(usage));

      return {
        exceeded: false,
        current: usage.requests,
        limit: this.maxPersonalRequests,
        remaining: this.maxPersonalRequests - usage.requests
      };

    } catch (error) {
      // Usage tracking unavailable - continuing with reduced functionality
      return { exceeded: false, current: 0, limit: this.maxPersonalRequests };
    }
  }

  /**
   * Determine license requirements based on usage context
   */
  assessLicenseRequirement() {
    const context = {
      isCI: process.env.CI === 'true',
      isProduction: process.env.NODE_ENV === 'production',
      isServer: !process.stdin.isTTY,
      hasCommercialIndicators: this.detectCommercialEnvironment(),
      workingDirectory: process.cwd(),
      processTitle: process.title || '',
      userAgent: process.env.USER_AGENT || ''
    };

    // High-confidence commercial usage indicators
    const commercialScore = [
      context.isCI ? 2 : 0,
      context.isProduction ? 3 : 0,
      context.isServer ? 1 : 0,
      context.hasCommercialIndicators ? 4 : 0,
      context.workingDirectory.includes('opt') ? 2 : 0,
      context.workingDirectory.includes('srv') ? 2 : 0,
      context.workingDirectory.includes('var/www') ? 3 : 0,
      context.processTitle.includes('docker') ? 1 : 0,
      context.processTitle.includes('kubernetes') ? 2 : 0
    ].reduce((sum, score) => sum + score, 0);

    return {
      context,
      commercialScore,
      requiresCommercialLicense: commercialScore >= 5,
      confidence: Math.min(commercialScore / 10, 1.0)
    };
  }

  /**
   * Detect commercial environment indicators
   */
  detectCommercialEnvironment() {
    const commercialEnvVars = [
      'KUBERNETES_SERVICE_HOST',
      'DOCKER_CONTAINER',
      'AWS_REGION',
      'AZURE_TENANT_ID',
      'GCP_PROJECT',
      'HEROKU_APP_NAME',
      'VERCEL_ENV',
      'NETLIFY_SITE_ID'
    ];

    return commercialEnvVars.some(envVar => process.env[envVar]);
  }

  /**
   * Comprehensive license check
   */
  performLicenseCheck() {
    const licenseKey = process.env.LICENSE_KEY || 
                      process.env.COMMERCIAL_LICENSE ||
                      this.readLicenseFile();

    const assessment = this.assessLicenseRequirement();
    const usageLimits = this.checkUsageLimits();

    // If commercial usage detected
    if (assessment.requiresCommercialLicense) {
      if (!licenseKey) {
        return {
          valid: false,
          type: 'commercial_required',
          message: 'Commercial license required for this usage context',
          assessment,
          action: 'block'
        };
      }

      const validation = this.validateLicenseKey(licenseKey);
      if (!validation.valid) {
        return {
          valid: false,
          type: 'invalid_license',
          message: `Invalid commercial license: ${validation.reason}`,
          assessment,
          action: 'block'
        };
      }

      return {
        valid: true,
        type: 'commercial',
        license: validation.data,
        assessment
      };
    }

    // Personal use - check limits
    if (usageLimits.exceeded) {
      return {
        valid: false,
        type: 'usage_limit_exceeded',
        message: `Personal usage limit exceeded (${usageLimits.current}/${usageLimits.limit} requests this month)`,
        usageLimits,
        action: 'block'
      };
    }

    return {
      valid: true,
      type: 'personal',
      usageLimits,
      assessment
    };
  }

  /**
   * Read license file from disk
   */
  readLicenseFile() {
    const licenseFiles = [
      '.license',
      'commercial.key',
      '.commercial'
    ];

    for (const filename of licenseFiles) {
      const filepath = path.join(process.cwd(), filename);
      if (fs.existsSync(filepath)) {
        try {
          return fs.readFileSync(filepath, 'utf8').trim();
        } catch (error) {
          console.warn(`Could not read license file ${filename}:`, error.message);
        }
      }
    }

    return null;
  }

  /**
   * Generate trial license for evaluation
   */
  generateTrialLicense(email) {
    const trialData = {
      email,
      type: 'trial',
      issued: new Date().toISOString(),
      expires: new Date(Date.now() + this.trialPeriod).toISOString(),
      features: ['basic_ai', 'limited_requests'],
      signature: 'trial-signature'
    };

    trialData.signature = this.generateLicenseSignature(trialData);
    return Buffer.from(JSON.stringify(trialData)).toString('base64');
  }
}

// Export singleton instance
export const licenseValidator = new LicenseValidator();