#!/usr/bin/env node

/**
 * Iris - Integrated Runtime Intelligence Service - Global Entry Point
 * Single command execution: iris
 */

import MultiAI from './index.js';
import { runCLI } from './cli.js';

// Export the main class for programmatic usage
export { MultiAI as EnhancedAI };
export default MultiAI;

// Always run CLI when this file is executed
runCLI().catch(error => {
  console.error('❌ CLI Error:', error.message);
  process.exit(1);
});