#!/usr/bin/env node

/**
 * Iris - Integrated Runtime Intelligence Service - Global Entry Point
 * Single command execution: iris
 * 
 * @author Jordan After Midnight
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */

import MultiAI from './index.js';
import { runCLI } from './cli.js';
import { integrityChecker } from './core/integrity-checker.js';
import { licenseValidator } from './core/license-validator.js';

// Export the main class for programmatic usage
export { MultiAI as EnhancedAI };
export default MultiAI;

// Perform security checks before running CLI
async function secureStart() {
  try {
    // Check system integrity
    const securityCheck = integrityChecker.performSecurityCheck();
    
    if (!securityCheck.allowed) {
      console.error('🚫 Iris Security: Operation blocked');
      securityCheck.warnings.forEach(warning => console.error(warning));
      process.exit(1);
    }

    // Check license compliance
    const licenseCheck = licenseValidator.performLicenseCheck();
    
    if (!licenseCheck.valid && licenseCheck.action === 'block') {
      console.error('🚫 Iris License: ' + licenseCheck.message);
      console.error('📧 Contact: jordanaftermidnight@users.noreply.github.com');
      process.exit(1);
    }

    // Show warnings if any
    if (securityCheck.warnings.length > 0) {
      console.warn('🔒 Iris Security Notice:');
      securityCheck.warnings.forEach(warning => console.warn(warning));
    }

    if (licenseCheck.type === 'personal' && licenseCheck.usageLimits) {
      const remaining = licenseCheck.usageLimits.remaining;
      if (remaining <= 100) {
        console.warn(`⚠️  Personal usage: ${remaining} requests remaining this month`);
      }
    }

    // Start CLI with security context
    await runCLI();
    
  } catch (error) {
    console.error('❌ Iris Error:', error.message);
    process.exit(1);
  }
}

// Always run secure startup when this file is executed
secureStart();