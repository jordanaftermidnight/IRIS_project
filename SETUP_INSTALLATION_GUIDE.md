# ⚙️ IRIS AI Orchestration System - Setup & Installation Guide

**Version**: 2.0 Production Ready  
**Target Audience**: System Administrators, DevOps Engineers, Developers  
**Difficulty Level**: Beginner to Advanced

---

## 🎯 Overview

This comprehensive guide walks you through installing and setting up the IRIS AI Orchestration System in various environments, from local development to production deployment. Choose the installation method that best fits your needs and technical requirements.

---

## 📚 Table of Contents

1. [System Requirements](#-system-requirements)
2. [Quick Start (5 Minutes)](#-quick-start-5-minutes)
3. [Development Setup](#-development-setup)
4. [Production Installation](#-production-installation)
5. [Docker Deployment](#-docker-deployment)
6. [Kubernetes Deployment](#-kubernetes-deployment)
7. [Configuration Guide](#-configuration-guide)
8. [Verification & Testing](#-verification--testing)
9. [Troubleshooting](#-troubleshooting)
10. [Post-Installation Tasks](#-post-installation-tasks)

---

## 💻 System Requirements

### Minimum Requirements

| Component | Requirement | Notes |
|-----------|-------------|-------|
| **Operating System** | Ubuntu 20.04+, CentOS 8+, macOS 11+, Windows 10+ | Linux recommended for production |
| **Node.js** | Version 18.0+ | LTS version recommended |
| **Memory** | 4GB RAM | 8GB+ recommended for production |
| **CPU** | 2 cores | 4+ cores recommended for production |
| **Storage** | 10GB free space | SSD recommended |
| **Network** | Broadband internet | For external AI providers |

### Recommended Production Requirements

| Component | Specification | Reasoning |
|-----------|---------------|-----------|
| **CPU** | 4-8 cores | Concurrent request handling |
| **Memory** | 16-32GB RAM | AI model caching and processing |
| **Storage** | 100GB NVMe SSD | Fast I/O for models and logs |
| **Network** | 1Gbps connection | High-throughput AI requests |
| **GPU** | NVIDIA GPU (optional) | Accelerated local AI models |

### Software Dependencies

#### Required
- **Node.js 18+**: JavaScript runtime
- **npm 9+**: Package manager
- **Git**: Version control (for installation)

#### Optional (for full functionality)
- **Docker & Docker Compose**: Container deployment
- **Ollama**: Local AI model hosting
- **Redis**: Caching and session storage
- **nginx**: Load balancing and reverse proxy

---

## ⚡ Quick Start (5 Minutes)

Perfect for trying IRIS on your local machine with minimal setup.

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/jordanaftermidnight/iris-project.git
cd iris-project

# Install dependencies
npm install

# Quick setup script
npm run setup
```

### 2. Set Environment Variables (Optional)

```bash
# For external AI providers (optional)
export GROQ_API_KEY="your-groq-api-key-here"
export GEMINI_API_KEY="your-gemini-api-key-here"

# Skip if you want to use only local AI (Ollama)
```

### 3. Start IRIS

```bash
# Start the system
npm start

# Or launch the web dashboard
npm run demo
```

### 4. Test Installation

```bash
# Test with CLI
iris chat "Hello, are you working?"

# Test with web interface
# Open http://localhost:8082 in your browser
```

🎉 **That's it!** IRIS is now running and ready to use.

---

## 🛠️ Development Setup

For developers who want to contribute to IRIS or customize it extensively.

### 1. Prerequisites Installation

#### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install development tools
sudo apt-get install -y git curl wget build-essential

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x
```

#### macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18
brew install git

# Verify installation
node --version
npm --version
```

#### Windows

```powershell
# Install Node.js (download from https://nodejs.org/)
# Or use Chocolatey
choco install nodejs --version 18.17.1

# Install Git
choco install git

# Verify installation (in new terminal)
node --version
npm --version
```

### 2. IRIS Installation

```bash
# Clone repository
git clone https://github.com/jordanaftermidnight/iris-project.git
cd iris-project

# Install dependencies
npm ci  # Use 'ci' for development for exact dependency versions

# Install development dependencies
npm install --save-dev eslint prettier jest

# Set up pre-commit hooks
npm run prepare
```

### 3. Optional: Install Ollama (Local AI)

#### Linux

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
systemctl start ollama

# Download recommended models
ollama pull qwen2.5:7b
ollama pull mistral:7b
ollama pull deepseek-coder:6.7b
```

#### macOS

```bash
# Download and install from https://ollama.ai/download
# Or use Homebrew
brew install ollama

# Start Ollama
brew services start ollama

# Download models
ollama pull qwen2.5:7b
ollama pull mistral:7b
```

#### Windows

```powershell
# Download installer from https://ollama.ai/download
# Run the installer

# Download models (in new terminal)
ollama pull qwen2.5:7b
ollama pull mistral:7b
```

### 4. Development Configuration

```bash
# Create development configuration
cp config/iris-config.example.json config/iris-config.dev.json

# Edit configuration for development
nano config/iris-config.dev.json
```

```json
{
    "environment": "development",
    "logging": {
        "level": "debug",
        "console": true,
        "file": false
    },
    "providers": {
        "ollama": {
            "enabled": true,
            "host": "http://localhost:11434",
            "priority": 1
        },
        "groq": {
            "enabled": true,
            "priority": 2
        }
    },
    "development": {
        "hotReload": true,
        "debugMode": true,
        "mockExternalAPIs": false
    }
}
```

### 5. Development Commands

```bash
# Start in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Start development server with hot reload
npm run dev:watch

# Build for production
npm run build
```

---

## 🏭 Production Installation

For production deployments with high availability and security considerations.

### 1. Server Preparation

#### Create IRIS User

```bash
# Create system user for IRIS
sudo useradd --system --create-home --shell /bin/bash iris
sudo usermod -aG sudo iris

# Switch to iris user
sudo -i -u iris
```

#### Install System Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm git nginx redis-server certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum update
sudo yum install -y nodejs npm git nginx redis epel-release
sudo yum install -y certbot python3-certbot-nginx

# Start and enable services
sudo systemctl enable --now redis-server nginx
```

### 2. IRIS Installation

```bash
# Navigate to installation directory
cd /opt
sudo mkdir iris
sudo chown iris:iris iris
cd iris

# Clone and install
git clone https://github.com/jordanaftermidnight/iris-project.git .
npm ci --only=production

# Create necessary directories
sudo mkdir -p /var/log/iris /etc/iris /var/lib/iris
sudo chown iris:iris /var/log/iris /var/lib/iris
sudo chown root:iris /etc/iris
sudo chmod 750 /etc/iris
```

### 3. Production Configuration

```bash
# Create production configuration
sudo cp config/iris-config.example.json /etc/iris/config.json
sudo chmod 640 /etc/iris/config.json
```

```json
{
    "environment": "production",
    "server": {
        "port": 3001,
        "host": "0.0.0.0",
        "workers": "auto",
        "timeout": 30000
    },
    "logging": {
        "level": "info",
        "file": "/var/log/iris/app.log",
        "maxSize": "100MB",
        "maxFiles": 10
    },
    "providers": {
        "ollama": {
            "enabled": true,
            "host": "http://localhost:11434",
            "priority": 1,
            "timeout": 30000
        },
        "groq": {
            "enabled": true,
            "priority": 2,
            "rateLimitRpm": 100
        },
        "gemini": {
            "enabled": true,
            "priority": 3,
            "safetySettings": "strict"
        }
    },
    "security": {
        "rateLimiting": {
            "windowMs": 900000,
            "max": 100
        },
        "cors": {
            "origin": ["https://your-domain.com"],
            "credentials": true
        },
        "headers": {
            "contentSecurityPolicy": true,
            "hsts": true
        }
    },
    "database": {
        "redis": {
            "host": "localhost",
            "port": 6379,
            "db": 0,
            "maxRetries": 3
        }
    },
    "monitoring": {
        "enabled": true,
        "prometheus": {
            "port": 9090,
            "path": "/metrics"
        }
    }
}
```

### 4. Environment Variables

```bash
# Create environment file
sudo tee /etc/iris/environment << EOF
NODE_ENV=production
IRIS_CONFIG_PATH=/etc/iris/config.json

# API Keys (replace with your actual keys)
GROQ_API_KEY=your-groq-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Redis
REDIS_URL=redis://localhost:6379/0

# Monitoring
PROMETHEUS_GATEWAY=http://localhost:9090
EOF

sudo chmod 600 /etc/iris/environment
```

### 5. SystemD Service

```bash
# Create systemd service file
sudo tee /etc/systemd/system/iris.service << EOF
[Unit]
Description=IRIS AI Orchestration System
After=network.target redis.service
Requires=redis.service

[Service]
Type=simple
User=iris
Group=iris
WorkingDirectory=/opt/iris
ExecStart=/usr/bin/node iris-api-server.js
EnvironmentFile=/etc/iris/environment
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=iris

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/iris /var/lib/iris

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
LimitAS=2G

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable iris
```

### 6. nginx Configuration

```bash
# Create nginx site configuration
sudo tee /etc/nginx/sites-available/iris << EOF
upstream iris_backend {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "no-referrer-when-downgrade";
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # API endpoints
    location /api/ {
        proxy_pass http://iris_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
    
    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://iris_backend/api/health;
        access_log off;
    }
    
    # Static files
    location / {
        root /opt/iris/public;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security.txt
    location /.well-known/security.txt {
        return 200 "Contact: security@your-domain.com";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/iris /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate

```bash
# Get SSL certificate with Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Set up automatic renewal
sudo crontab -e
# Add line: 0 12 * * * /usr/bin/certbot renew --quiet --reload-nginx
```

### 8. Start Services

```bash
# Start IRIS service
sudo systemctl start iris

# Check status
sudo systemctl status iris

# View logs
sudo journalctl -u iris -f
```

---

## 🐳 Docker Deployment

Containerized deployment for consistency and scalability.

### 1. Docker Installation

#### Ubuntu/Debian

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Start Docker service
sudo systemctl enable --now docker
```

#### macOS

```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop from Applications folder
```

### 2. Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  iris-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - IRIS_CONFIG_PATH=/app/config/config.json
      - REDIS_URL=redis://redis:6379/0
    env_file:
      - .env
    depends_on:
      - redis
      - ollama
    restart: unless-stopped
    volumes:
      - ./config:/app/config:ro
      - iris-logs:/app/logs
      - iris-data:/app/data
    networks:
      - iris-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped
    networks:
      - iris-network
    # Uncomment for GPU support
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    networks:
      - iris-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/sites:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
      - iris-static:/usr/share/nginx/html
    depends_on:
      - iris-api
    restart: unless-stopped
    networks:
      - iris-network

volumes:
  iris-logs:
  iris-data:
  iris-static:
  ollama-data:
  redis-data:

networks:
  iris-network:
    driver: bridge
```

### 3. Environment Configuration

```bash
# Create .env file
cat > .env << EOF
# API Keys
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Application
LOG_LEVEL=info
ENABLE_METRICS=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# External URLs
CORS_ORIGIN=https://your-domain.com
EOF
```

### 4. Start Docker Stack

```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Scale API servers
docker-compose up -d --scale iris-api=3
```

### 5. Initialize Ollama Models

```bash
# Download AI models
docker-compose exec ollama ollama pull qwen2.5:7b
docker-compose exec ollama ollama pull mistral:7b
docker-compose exec ollama ollama pull deepseek-coder:6.7b
```

---

## ☸️ Kubernetes Deployment

Enterprise-grade deployment with auto-scaling and high availability.

### 1. Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar -xzO linux-amd64/helm > helm
sudo install -o root -g root -m 0755 helm /usr/local/bin/helm
```

### 2. Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: iris-system
  labels:
    name: iris-system
```

### 3. ConfigMap and Secrets

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: iris-config
  namespace: iris-system
data:
  config.json: |
    {
      "environment": "production",
      "server": {
        "port": 3001,
        "workers": "auto"
      },
      "providers": {
        "ollama": {
          "enabled": true,
          "host": "http://ollama-service:11434",
          "priority": 1
        }
      },
      "database": {
        "redis": {
          "host": "redis-service",
          "port": 6379
        }
      }
    }
---
apiVersion: v1
kind: Secret
metadata:
  name: iris-secrets
  namespace: iris-system
type: Opaque
data:
  groq-api-key: <base64-encoded-key>
  gemini-api-key: <base64-encoded-key>
  jwt-secret: <base64-encoded-secret>
```

### 4. Deployments

```yaml
# iris-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iris-api
  namespace: iris-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: iris-api
  template:
    metadata:
      labels:
        app: iris-api
    spec:
      containers:
      - name: iris-api
        image: iris-ai:2.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: IRIS_CONFIG_PATH
          value: "/app/config/config.json"
        - name: GROQ_API_KEY
          valueFrom:
            secretKeyRef:
              name: iris-secrets
              key: groq-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: config-volume
        configMap:
          name: iris-config
```

### 5. Services and Ingress

```yaml
# services.yaml
apiVersion: v1
kind: Service
metadata:
  name: iris-api-service
  namespace: iris-system
spec:
  selector:
    app: iris-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: iris-ingress
  namespace: iris-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: iris-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: iris-api-service
            port:
              number: 80
```

### 6. Auto-scaling

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: iris-api-hpa
  namespace: iris-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: iris-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 7. Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f iris-deployment.yaml
kubectl apply -f services.yaml
kubectl apply -f hpa.yaml

# Check deployment status
kubectl get pods -n iris-system
kubectl get services -n iris-system
kubectl get ingress -n iris-system

# View logs
kubectl logs -f deployment/iris-api -n iris-system
```

---

## ⚙️ Configuration Guide

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3001` | Server port |
| `IRIS_CONFIG_PATH` | No | `./config/iris-config.json` | Config file path |
| `GROQ_API_KEY` | No | - | Groq API key for fast inference |
| `GEMINI_API_KEY` | No | - | Google Gemini API key |
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic Claude API key |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Ollama server URL |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `LOG_LEVEL` | No | `info` | Logging level |
| `JWT_SECRET` | Prod | - | JWT signing secret |
| `ENCRYPTION_KEY` | Prod | - | Data encryption key |

### Configuration File Structure

```json
{
    "environment": "production",
    "server": {
        "port": 3001,
        "host": "0.0.0.0",
        "workers": "auto",
        "timeout": 30000,
        "keepAliveTimeout": 5000
    },
    "logging": {
        "level": "info",
        "console": true,
        "file": "/var/log/iris/app.log",
        "maxSize": "100MB",
        "maxFiles": 10,
        "format": "json"
    },
    "providers": {
        "ollama": {
            "enabled": true,
            "host": "http://localhost:11434",
            "priority": 1,
            "timeout": 30000,
            "models": ["qwen2.5:7b", "mistral:7b"],
            "healthCheckInterval": 30000
        },
        "groq": {
            "enabled": true,
            "priority": 2,
            "baseURL": "https://api.groq.com/openai/v1",
            "rateLimitRpm": 100,
            "timeout": 15000,
            "models": ["llama-3.1-8b-instant"]
        }
    },
    "routing": {
        "maxCost": 0.05,
        "timeout": 30000,
        "retryAttempts": 3,
        "fallbackEnabled": true,
        "costOptimized": true
    },
    "security": {
        "rateLimiting": {
            "enabled": true,
            "windowMs": 900000,
            "max": 100,
            "message": "Too many requests"
        },
        "cors": {
            "origin": ["https://your-domain.com"],
            "credentials": true,
            "methods": ["GET", "POST", "OPTIONS"]
        },
        "inputValidation": {
            "enabled": true,
            "maxLength": 10000,
            "sanitizeHtml": true
        },
        "auditLogging": {
            "enabled": true,
            "logFile": "/var/log/iris/audit.log"
        }
    },
    "database": {
        "redis": {
            "host": "localhost",
            "port": 6379,
            "db": 0,
            "password": null,
            "connectTimeout": 10000,
            "maxRetries": 3,
            "retryDelayOnFailover": 100
        }
    },
    "caching": {
        "enabled": true,
        "ttl": 3600,
        "maxSize": 1000,
        "type": "redis"
    },
    "monitoring": {
        "enabled": true,
        "prometheus": {
            "enabled": true,
            "port": 9090,
            "path": "/metrics"
        },
        "healthCheck": {
            "enabled": true,
            "interval": 30000,
            "timeout": 5000
        }
    }
}
```

---

## ✅ Verification & Testing

### 1. Health Check

```bash
# Test API health
curl -f http://localhost:3001/api/health

# Expected response:
{
    "status": "healthy",
    "timestamp": "2025-09-01T12:00:00.000Z",
    "uptime": 3600000,
    "providers": {
        "ollama": { "available": true, "health": 98 }
    }
}
```

### 2. Basic Functionality Test

```bash
# Test CLI
iris chat "Hello, are you working correctly?"

# Test API
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test query", "taskType": "fast"}'
```

### 3. Provider Connectivity Test

```bash
# Check provider status
curl http://localhost:3001/api/providers

# Test specific provider
iris chat "Test message" --provider=ollama
```

### 4. Performance Test

```bash
# Install artillery for load testing
npm install -g artillery

# Basic load test
artillery quick --count 10 --num 2 http://localhost:3001/api/health
```

### 5. Security Test

```bash
# Test rate limiting
for i in {1..20}; do
    curl -w "%{http_code}\n" -o /dev/null -s http://localhost:3001/api/chat \
         -X POST -H "Content-Type: application/json" \
         -d '{"message": "test"}'
done
```

### 6. Web Dashboard Test

```bash
# Start web dashboard
npm run demo

# Open browser and test:
# 1. Submit queries in the interface
# 2. Check real-time metrics
# 3. Test demo control buttons
# 4. Verify provider status display
```

---

## 🔧 Troubleshooting

### Common Installation Issues

#### Node.js Version Issues

```bash
# Check Node.js version
node --version

# If version is incorrect, install correct version
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Permission Issues

```bash
# Fix npm global permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile

# Fix file permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R iris:iris /opt/iris /var/log/iris
```

#### Port Already in Use

```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill process if necessary
sudo kill -9 <PID>

# Or change port in configuration
export PORT=3002
npm start
```

#### Ollama Connection Issues

```bash
# Check Ollama status
curl http://localhost:11434/api/version

# If not running, start Ollama
systemctl start ollama
# or
ollama serve

# Check models
ollama list

# Pull required models
ollama pull qwen2.5:7b
```

#### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# If not running
sudo systemctl start redis-server

# Test connection
redis-cli -h localhost -p 6379 ping

# Check logs
sudo journalctl -u redis -f
```

### Performance Issues

#### High Memory Usage

```bash
# Monitor memory usage
htop
# or
ps aux --sort=-%mem | head -10

# Increase Node.js memory limit
node --max-old-space-size=4096 iris-api-server.js

# Enable garbage collection logging
node --expose-gc --trace-gc iris-api-server.js
```

#### Slow Response Times

```bash
# Check system resources
top
iostat -x 1 5

# Check provider response times
curl -s http://localhost:3001/api/providers | jq '.[] | {name: .name, responseTime: .responseTime}'

# Enable debug logging
export LOG_LEVEL=debug
npm start
```

### Network Issues

#### Firewall Configuration

```bash
# Ubuntu/Debian
sudo ufw allow 3001/tcp
sudo ufw allow 11434/tcp
sudo ufw allow 6379/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=11434/tcp
sudo firewall-cmd --reload
```

#### DNS Issues

```bash
# Test external API connectivity
nslookup api.groq.com
nslookup generativelanguage.googleapis.com

# Test with different DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf.tmp
```

### Configuration Issues

#### Environment Variables Not Loading

```bash
# Check environment variables
printenv | grep IRIS
printenv | grep API_KEY

# Source environment file manually
set -a
source /etc/iris/environment
set +a

# Verify in Node.js
node -e "console.log(process.env.GROQ_API_KEY)"
```

#### Configuration File Syntax

```bash
# Validate JSON configuration
python3 -m json.tool /etc/iris/config.json

# Check file permissions
ls -la /etc/iris/config.json
```

---

## 📝 Post-Installation Tasks

### 1. Security Hardening

```bash
# Set up log rotation
sudo tee /etc/logrotate.d/iris << EOF
/var/log/iris/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 iris iris
    postrotate
        systemctl reload iris
    endscript
}
EOF

# Set up automated backups
sudo tee /etc/cron.d/iris-backup << EOF
0 2 * * * iris /opt/iris/scripts/backup.sh >> /var/log/iris/backup.log 2>&1
EOF

# Configure fail2ban for additional security
sudo tee /etc/fail2ban/jail.d/iris.conf << EOF
[iris]
enabled = true
port = 3001,80,443
filter = iris
logpath = /var/log/iris/*.log
maxretry = 5
bantime = 3600
EOF
```

### 2. Monitoring Setup

```bash
# Install monitoring tools
npm install -g pm2

# Set up PM2 for process management
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

# Configure system metrics collection
sudo apt install -y prometheus-node-exporter
sudo systemctl enable --now prometheus-node-exporter
```

### 3. Performance Optimization

```bash
# Optimize system settings
echo 'net.core.somaxconn = 65535' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65535' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max = 2097152' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Optimize for AI workloads
echo 'vm.swappiness = 10' | sudo tee -a /etc/sysctl.conf
echo 'vm.dirty_ratio = 15' | sudo tee -a /etc/sysctl.conf
```

### 4. Documentation

```bash
# Create operational documentation
mkdir -p /opt/iris/docs
cp OPERATIONAL_MANUAL.md /opt/iris/docs/
cp USER_GUIDE.md /opt/iris/docs/
cp DEVELOPER_GUIDE.md /opt/iris/docs/

# Set up API documentation
npm run docs:generate
```

### 5. Team Access

```bash
# Create team access
sudo groupadd iris-team
sudo usermod -aG iris-team alice
sudo usermod -aG iris-team bob

# Set up SSH access
sudo mkdir -p /home/iris/.ssh
sudo chown iris:iris /home/iris/.ssh
sudo chmod 700 /home/iris/.ssh

# Configure sudo access
echo '%iris-team ALL=(iris) NOPASSWD: /bin/systemctl restart iris, /bin/systemctl status iris, /usr/bin/tail -f /var/log/iris/*.log' | sudo tee /etc/sudoers.d/iris-team
```

---

## 📞 Support & Next Steps

### Getting Help

1. **Documentation**: Check the complete documentation suite
2. **GitHub Issues**: Report bugs and request features  
3. **Community**: Join discussions and get help from other users
4. **Professional Support**: Contact for enterprise deployments

### Recommended Next Steps

1. **Set up monitoring and alerting**
2. **Configure automated backups**
3. **Implement CI/CD pipeline**
4. **Set up staging environment**
5. **Configure high availability**
6. **Implement security scanning**
7. **Set up log aggregation**
8. **Configure performance monitoring**

### Useful Resources

- **Knowledge Base**: Complete technical reference
- **User Guide**: End-user documentation
- **Developer Guide**: Integration and customization
- **Operational Manual**: Day-to-day operations
- **API Documentation**: Programmatic access reference

---

**Setup & Installation Guide Version**: 2.0  
**Last Updated**: September 1, 2025  
**Next Review**: October 1, 2025

🎉 **Congratulations!** You have successfully installed and configured the IRIS AI Orchestration System. The system is now ready to intelligently route your AI queries to the most suitable providers while optimizing for cost, quality, and performance.

*This installation guide covers the most common deployment scenarios. For specialized environments or custom requirements, please refer to the Developer Guide or contact support.*