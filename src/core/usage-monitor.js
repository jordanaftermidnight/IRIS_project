#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Usage Monitoring and Anomaly Detection System
 * Tracks usage patterns and detects potential misuse
 * 
 * @author Jordan After Midnight
 * @author Claude AI (implementation assistance)
 * @copyright 2025 Jordan After Midnight. All rights reserved.
 */
export class UsageMonitor {
  constructor() {
    this.logFile = path.join(process.cwd(), '.usage-log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.suspiciousPatterns = [
      // Automated usage patterns
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      // High frequency indicators
      /(rapid|bulk|batch|automated|script|bot)/i,
      // Suspicious content patterns
      /(exploit|hack|unauthorized|security)/i,
      // Commercial usage without license
      /(production|enterprise|commercial|business)/i
    ];
  }

  /**
   * Log usage event
   */
  logUsage(event) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      ppid: process.ppid,
      user: process.env.USER || process.env.USERNAME || 'unknown',
      cwd: process.cwd(),
      args: process.argv.slice(2),
      ...event
    };

    try {
      // Rotate log if too large
      this.rotateLogIfNeeded();
      
      // Append to log
      fs.appendFileSync(
        this.logFile, 
        JSON.stringify(logEntry) + '\n'
      );

      // Check for suspicious patterns
      this.detectAnomalies(logEntry);

    } catch (error) {
      // Silent fail for logging to avoid breaking functionality
      // Usage logging unavailable - continuing operation
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   */
  rotateLogIfNeeded() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxLogSize) {
          const backupFile = this.logFile + '.backup';
          fs.renameSync(this.logFile, backupFile);
        }
      }
    } catch (error) {
      // Continue if rotation fails
    }
  }

  /**
   * Detect usage anomalies and suspicious patterns
   */
  detectAnomalies(logEntry) {
    const anomalies = [];

    // Check message content for suspicious patterns
    if (logEntry.message) {
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(logEntry.message)) {
          anomalies.push({
            type: 'suspicious_content',
            pattern: pattern.toString(),
            confidence: 0.8
          });
        }
      }
    }

    // Check for rapid requests (potential automation)
    const recentRequests = this.getRecentRequests(60000); // Last minute
    if (recentRequests.length > 20) {
      anomalies.push({
        type: 'high_frequency',
        count: recentRequests.length,
        timeframe: '1 minute',
        confidence: 0.9
      });
    }

    // Check for identical requests (potential spam)
    const duplicateCount = this.countDuplicateRequests(logEntry.message);
    if (duplicateCount > 5) {
      anomalies.push({
        type: 'duplicate_requests',
        count: duplicateCount,
        confidence: 0.95
      });
    }

    // Report anomalies
    if (anomalies.length > 0) {
      this.reportAnomalies(logEntry, anomalies);
    }
  }

  /**
   * Get recent requests from log
   */
  getRecentRequests(timeWindowMs) {
    try {
      if (!fs.existsSync(this.logFile)) return [];

      const cutoff = Date.now() - timeWindowMs;
      const logs = fs.readFileSync(this.logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(entry => new Date(entry.timestamp).getTime() > cutoff);

      return logs;
    } catch (error) {
      return [];
    }
  }

  /**
   * Count duplicate requests
   */
  countDuplicateRequests(message) {
    if (!message) return 0;

    try {
      const recentLogs = this.getRecentRequests(24 * 60 * 60 * 1000); // Last 24 hours
      return recentLogs.filter(entry => entry.message === message).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Report detected anomalies
   */
  reportAnomalies(logEntry, anomalies) {
    const report = {
      timestamp: new Date().toISOString(),
      user: logEntry.user,
      anomalies,
      context: {
        pid: logEntry.pid,
        cwd: logEntry.cwd,
        messageHash: logEntry.message ? 
          crypto.createHash('sha256').update(logEntry.message).digest('hex').slice(0, 16) : 
          null
      }
    };

    // Anomaly detected - logging for analysis

    // Log to anomaly file
    const anomalyFile = path.join(process.cwd(), '.anomalies');
    try {
      fs.appendFileSync(anomalyFile, JSON.stringify(report) + '\n');
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Generate usage analytics report
   */
  generateUsageReport() {
    try {
      const logs = this.getRecentRequests(30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      const report = {
        period: '30 days',
        totalRequests: logs.length,
        uniqueUsers: new Set(logs.map(log => log.user)).size,
        averageRequestsPerDay: logs.length / 30,
        topCommands: this.getTopCommands(logs),
        anomalyCount: this.getAnomalyCount(),
        usagePatterns: this.analyzeUsagePatterns(logs)
      };

      return report;
    } catch (error) {
      return { error: 'Could not generate usage report' };
    }
  }

  /**
   * Get most used commands
   */
  getTopCommands(logs) {
    const commands = {};
    logs.forEach(log => {
      const command = log.args[0] || 'unknown';
      commands[command] = (commands[command] || 0) + 1;
    });

    return Object.entries(commands)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([command, count]) => ({ command, count }));
  }

  /**
   * Get anomaly count
   */
  getAnomalyCount() {
    try {
      const anomalyFile = path.join(process.cwd(), '.anomalies');
      if (!fs.existsSync(anomalyFile)) return 0;

      return fs.readFileSync(anomalyFile, 'utf8')
        .split('\n')
        .filter(line => line.trim()).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Analyze usage patterns
   */
  analyzeUsagePatterns(logs) {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);

    logs.forEach(log => {
      const date = new Date(log.timestamp);
      hourlyDistribution[date.getHours()]++;
      dailyDistribution[date.getDay()]++;
    });

    return {
      peakHour: hourlyDistribution.indexOf(Math.max(...hourlyDistribution)),
      peakDay: dailyDistribution.indexOf(Math.max(...dailyDistribution)),
      hourlyDistribution,
      dailyDistribution
    };
  }
}

// Export singleton instance
export const usageMonitor = new UsageMonitor();