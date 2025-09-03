# 🔒 IRIS Security Guide

**IRIS AI Orchestration System - Security Best Practices**

*Author: Jordan After Midnight*  
*Implementation: Claude AI*  
*Copyright: 2025 Jordan After Midnight. All rights reserved.*

---

## 🛡️ **Security Overview**

Since IRIS is open-source and publicly available, proper security configuration is essential for production deployments.

## 🔑 **API Key Security**

### **Critical Security Practices**
```bash
# ✅ GOOD: Use environment variables
export OPENAI_API_KEY="sk-your-real-key"

# ❌ BAD: Never hardcode keys in source
const apiKey = "sk-your-real-key"  // DON'T DO THIS!
```

### **Environment Configuration**
1. **Copy template**: `cp .env.example .env`
2. **Add real keys**: Edit `.env` with your API keys
3. **Verify gitignore**: Ensure `.env` is in `.gitignore`
4. **Set permissions**: `chmod 600 .env` (owner-only access)

### **Key Rotation Strategy**
- 🔄 **Rotate keys monthly** or after any security incident
- 📊 **Monitor usage** through provider dashboards
- 🚨 **Revoke immediately** if compromise suspected
- 🔐 **Use separate keys** for development/production

## 🌐 **Network Security**

### **Default Configuration (Secure)**
```bash
# Localhost-only binding (recommended)
IRIS_HOST=127.0.0.1
IRIS_PORT=3001
```

### **Network Exposure Options**
```bash
# ⚠️  CAUTION: Network accessible (only if needed)
IRIS_HOST=0.0.0.0  # Accessible from local network
IRIS_PORT=3001

# 🔒 PRODUCTION: Use reverse proxy + SSL
# nginx/Apache with SSL termination
# NEVER expose API directly to internet
```

## 🛡️ **Request Security**

### **Rate Limiting**
```bash
# Configure in .env
IRIS_RATE_LIMIT_MAX=100        # Max requests per window
IRIS_RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
```

### **Request Validation**
- ✅ **Size limits**: Requests limited to 1MB by default
- ✅ **CORS protection**: Configured allowed origins
- ✅ **Input sanitization**: Automatic content filtering
- ✅ **Timeout handling**: Prevents hanging requests

## 📝 **Logging & Privacy**

### **Production Settings**
```bash
# Disable detailed logging in production
IRIS_ENABLE_LOGGING=false
NODE_ENV=production
```

### **Log Management**
- 🚫 **Never log API keys** or sensitive data
- 🔄 **Rotate logs** regularly to prevent disk filling
- 🔍 **Monitor for** unusual patterns or attacks
- 🗑️ **Purge old logs** based on retention policy

## 🔧 **Dependency Security**

### **Regular Security Audits**
```bash
# Check for vulnerabilities
npm audit

# Auto-fix known issues
npm audit fix

# Update dependencies
npm update
```

### **Security Monitoring**
- 📅 **Weekly audits**: Run `npm audit` regularly
- 🔄 **Keep updated**: Update dependencies promptly
- 📋 **Track CVEs**: Monitor security advisories
- 🧪 **Test updates**: Verify functionality after updates

## 🌍 **Production Deployment**

### **Recommended Architecture**
```
Internet → SSL/TLS → Reverse Proxy → IRIS API Server
          (nginx)   (localhost:3001)
```

### **Production Checklist**
- ✅ **SSL/TLS termination** at reverse proxy
- ✅ **Firewall rules** blocking direct API access
- ✅ **Environment isolation** (separate dev/prod)
- ✅ **Backup strategy** for configuration and data
- ✅ **Monitoring & alerting** for security events
- ✅ **Access logging** at proxy level
- ✅ **Regular security reviews** and penetration testing

## 🚨 **Incident Response**

### **If API Key Compromised**
1. **Immediate**: Revoke key at provider console
2. **Generate**: Create new key with different name
3. **Update**: Change `.env` configuration
4. **Restart**: IRIS service to use new key
5. **Monitor**: Check for unauthorized usage
6. **Review**: Access logs for suspicious activity

### **If System Compromised**
1. **Isolate**: Disconnect from network immediately
2. **Preserve**: Evidence for forensic analysis
3. **Rotate**: All API keys and credentials
4. **Rebuild**: System from known-good state
5. **Analyze**: Logs to determine attack vector
6. **Patch**: Identified vulnerabilities

## 📊 **Security Monitoring**

### **Key Metrics to Monitor**
- 🔍 **Request patterns**: Unusual volume or sources
- ⚡ **Response times**: Potential DoS attacks
- 🚨 **Error rates**: Failed authentication attempts
- 💰 **API costs**: Unexpected usage spikes
- 🔐 **Failed logins**: Brute force attempts

### **Alerting Thresholds**
```bash
# Example alert conditions
- Rate limit exceeded > 10 times/hour
- API costs > 200% of normal
- Error rate > 5% for 10+ minutes
- Requests from new IP ranges
- Unusual geographic access patterns
```

## 🔐 **Advanced Security**

### **Additional Hardening**
- 🔑 **API authentication**: Add API key requirement
- 🛡️ **Request signing**: HMAC signature validation
- 🌐 **IP whitelisting**: Restrict source addresses
- 🔍 **Content filtering**: Block malicious prompts
- 📝 **Audit logging**: Detailed security events
- 🔒 **Encryption at rest**: Encrypted configuration files

### **Compliance Considerations**
- 📋 **GDPR**: User data handling and privacy
- 🏥 **HIPAA**: Healthcare data protection
- 💳 **PCI DSS**: Payment card information
- 🏢 **SOX**: Financial reporting controls
- 🎓 **FERPA**: Educational records privacy

---

## ⚡ **Quick Security Setup**

```bash
# 1. Secure environment setup
cp .env.example .env
chmod 600 .env
# Edit .env with your settings

# 2. Security audit
npm audit fix

# 3. Secure startup
NODE_ENV=production npm run api

# 4. Verify security
curl -I http://localhost:3001/api/health
```

## 📞 **Security Contact**

For security issues or vulnerabilities:
- 🐛 **Report via**: GitHub Issues (public)
- 🔒 **Sensitive issues**: Contact maintainer directly
- ⚡ **Response time**: 24-48 hours for security issues

---

**Remember: Security is a continuous process, not a one-time setup!**