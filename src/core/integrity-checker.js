#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Code Integrity Protection System
 * Prevents unauthorized modifications and ensures ethical usage
 * 
 * @author Jordan After Midnight (concept and architecture)
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class IntegrityChecker {
  constructor() {
    this.coreFiles = [
      'src/enhanced-ai.js',
      'src/core/ai-router.js',
      'src/providers/ollama-provider.js',
      'src/providers/openai-provider.js',
      'src/providers/gemini-provider.js',
      'src/providers/groq-provider.js',
      'src/providers/claude-provider.js',
      'LICENSE',
      'package.json'
    ];
    
    // Ethical usage keywords that trigger warnings
    this.prohibitedPatterns = [
      /malware|virus|trojan|backdoor/i,
      /hack|exploit|vulnerability|attack/i,
      /spam|phishing|scam|fraud/i,
      /illegal|piracy|copyright.?infringement/i,
      /harassment|abuse|stalking/i,
      /generate.?(fake|false).?(news|information)/i,
      /deepfake|manipulate.?media/i,
      /unauthorized.?access/i,
      /prompt.?injection/i,
      /safety.?removal/i
    ];

    this.expectedHashes = this.generateFileHashes();
  }

  /**
   * Generate cryptographic hashes for core files
   */
  generateFileHashes() {
    const hashes = {};
    const projectRoot = path.resolve(__dirname, '../..');
    
    for (const file of this.coreFiles) {
      const filePath = path.join(projectRoot, file);
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          hashes[file] = crypto.createHash('sha256').update(content).digest('hex');
        }
      } catch (error) {
        console.warn(`⚠️  Could not hash ${file}: ${error.message}`);
      }
    }
    
    return hashes;
  }

  /**
   * Verify file integrity
   */
  verifyIntegrity() {
    const currentHashes = this.generateFileHashes();
    const violations = [];
    
    for (const [file, expectedHash] of Object.entries(this.expectedHashes)) {
      const currentHash = currentHashes[file];
      if (currentHash && currentHash !== expectedHash) {
        violations.push({
          file,
          type: 'modification',
          message: `Core file ${file} has been modified`
        });
      }
    }
    
    return violations;
  }

  /**
   * Check for ethical usage violations
   */
  checkEthicalUsage(message) {
    const violations = [];
    
    for (const pattern of this.prohibitedPatterns) {
      if (pattern.test(message)) {
        violations.push({
          type: 'ethical_violation',
          pattern: pattern.toString(),
          message: 'Request contains potentially unethical content'
        });
      }
    }
    
    return violations;
  }

  /**
   * Validate commercial license compliance
   */
  validateLicenseCompliance() {
    const projectRoot = path.resolve(__dirname, '../..');
    const packagePath = path.join(projectRoot, 'package.json');
    
    try {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check if running in commercial environment
      const isCommercialEnv = this.detectCommercialUsage();
      
      if (isCommercialEnv && !this.hasValidCommercialLicense()) {
        return {
          valid: false,
          message: 'Commercial usage detected but no valid commercial license found. Contact jordanaftermidnight@users.noreply.github.com for licensing.',
          action: 'restrict'
        };
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        message: 'Could not validate license compliance',
        action: 'warn'
      };
    }
  }

  /**
   * Detect commercial usage patterns
   */
  detectCommercialUsage() {
    // Check for commercial environment indicators
    const commercialIndicators = [
      process.env.NODE_ENV === 'production',
      !!process.env.COMMERCIAL_LICENSE,
      !!process.env.ENTERPRISE_MODE,
      // Check deployment environment patterns
      process.cwd().includes('/opt/'),
      process.cwd().includes('/usr/local/'),
      process.cwd().includes('Program Files'),
      // Check for automated environments
      process.env.CI === 'true',
      !!process.env.GITHUB_ACTIONS,
      !!process.env.JENKINS_URL,
      !!process.env.GITLAB_CI
    ];
    
    return commercialIndicators.some(indicator => indicator);
  }

  /**
   * Check for valid commercial license
   */
  hasValidCommercialLicense() {
    // Check for license key or certificate
    const licenseIndicators = [
      !!process.env.COMMERCIAL_LICENSE,
      !!process.env.LICENSE_KEY,
      fs.existsSync(path.join(process.cwd(), '.license')),
      fs.existsSync(path.join(process.cwd(), 'commercial.key'))
    ];
    
    return licenseIndicators.some(indicator => indicator);
  }

  /**
   * Runtime protection check
   */
  performSecurityCheck(userMessage = '') {
    const results = {
      integrity: [],
      ethical: [],
      license: null,
      allowed: true,
      warnings: []
    };

    // Check file integrity
    results.integrity = this.verifyIntegrity();
    if (results.integrity.length > 0) {
      results.warnings.push('⚠️  Core file modifications detected. System integrity may be compromised.');
    }

    // Check ethical usage
    if (userMessage) {
      results.ethical = this.checkEthicalUsage(userMessage);
      if (results.ethical.length > 0) {
        results.allowed = false;
        results.warnings.push('🚫 Request blocked: Potentially unethical usage detected.');
      }
    }

    // Check license compliance
    results.license = this.validateLicenseCompliance();
    if (!results.license.valid && results.license.action === 'restrict') {
      results.allowed = false;
      results.warnings.push('🚫 Commercial usage requires valid license.');
    }

    return results;
  }

  /**
   * Generate integrity report
   */
  generateIntegrityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: '0.9.0',
      release_type: 'beta',
      integrity: this.verifyIntegrity(),
      license: this.validateLicenseCompliance(),
      commercial_detected: this.detectCommercialUsage(),
      valid_license: this.hasValidCommercialLicense(),
      file_count: this.coreFiles.length,
      hash_algorithm: 'SHA-256',
      version_tamper_check: this.validateVersionIntegrity()
    };

    return report;
  }

  /**
   * Validate version integrity to prevent tampering
   */
  validateVersionIntegrity() {
    try {
      // Check package.json version
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const expectedVersion = '0.9.0';
        
        if (packageJson.version !== expectedVersion) {
          console.warn('⚠️  Version mismatch detected');
          return {
            valid: false,
            expected: expectedVersion,
            found: packageJson.version,
            warning: 'Version tampering detected'
          };
        }
      }
      
      return { valid: true, version: '0.9.0', type: 'beta' };
    } catch (error) {
      return { valid: false, error: 'Version validation failed' };
    }
  }
}

// Export singleton instance
export const integrityChecker = new IntegrityChecker();

/**
 * Decorator for protecting AI provider methods
 */
export function protectedMethod(target, propertyName, descriptor) {
  const method = descriptor.value;

  descriptor.value = function(...args) {
    const userMessage = args[0] || '';
    const securityCheck = integrityChecker.performSecurityCheck(userMessage);

    if (!securityCheck.allowed) {
      const error = new Error('Operation blocked by security policy');
      error.violations = [...securityCheck.ethical, ...securityCheck.integrity];
      error.license = securityCheck.license;
      throw error;
    }

    if (securityCheck.warnings.length > 0) {
      console.warn('🔒 Iris Security Notice:');
      securityCheck.warnings.forEach(warning => console.warn(warning));
    }

    return method.apply(this, args);
  };

  return descriptor;
}