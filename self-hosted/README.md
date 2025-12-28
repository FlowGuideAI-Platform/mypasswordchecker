# MyPasswordChecker.com - Self-Hosted Edition

## 🔒 SOC 2 Type 2 Compliant Password Strength API

This is the self-hosted version of MyPasswordChecker.com, designed for enterprises requiring SOC 2 Type 2 compliance. Deploy on your own infrastructure for complete control over data, security, and compliance.

---

## ✅ Compliance Features

### SOC 2 Type 2 Requirements Met:

- ✅ **Comprehensive audit logging** - Every API request logged with immutable audit trail
- ✅ **Access controls** - API key authentication, RBAC, least privilege
- ✅ **Encryption at rest** - PostgreSQL with encryption support
- ✅ **Encryption in transit** - TLS 1.2/1.3 enforced
- ✅ **Network segmentation** - Kubernetes NetworkPolicies included
- ✅ **Security headers** - OWASP best practices (CSP, HSTS, X-Frame-Options, etc.)
- ✅ **Rate limiting** - DDoS protection built-in
- ✅ **Health monitoring** - Kubernetes probes for liveness/readiness
- ✅ **Resource limits** - CPU/memory quotas enforced
- ✅ **Non-root containers** - Running as UID 1001
- ✅ **Immutable infrastructure** - Docker containers, GitOps ready
- ✅ **High availability** - Multi-replica deployment with auto-scaling

---

## 🚀 Quick Start

### Option 1: Docker Compose (Local Development)

```bash
# 1. Clone and navigate
cd self-hosted

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your values
nano .env

# 4. Start all services
docker-compose up -d

# 5. Check health
curl http://localhost:3000/health
```

### Option 2: Kubernetes (Production)

```bash
# 1. Update secrets in k8s/secrets.yaml
nano k8s/secrets.yaml

# 2. Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/network-policy.yaml

# 3. Verify deployment
kubectl get pods -n mypasswordchecker
kubectl logs -n mypasswordchecker deployment/mypasswordchecker-api
```

---

## 📦 What's Included

### Files Created:

```
self-hosted/
├── server.js                   # Node.js API server (production-ready)
├── package.json                # Dependencies and scripts
├── Dockerfile                  # Multi-stage production build
├── .dockerignore              # Docker build exclusions
├── docker-compose.yml         # Full stack (API + PostgreSQL + Redis + Nginx)
├── .env.example               # Environment configuration template
├── init.sql                   # PostgreSQL schema with audit tables
├── nginx.conf                 # Nginx reverse proxy with security headers
├── k8s/                       # Kubernetes manifests
│   ├── namespace.yaml         # Dedicated namespace
│   ├── secrets.yaml           # Secrets management
│   ├── postgres.yaml          # StatefulSet for PostgreSQL
│   ├── redis.yaml             # Deployment for Redis
│   ├── deployment.yaml        # API deployment (3 replicas)
│   ├── service.yaml           # ClusterIP service
│   ├── ingress.yaml           # HTTPS ingress with TLS
│   ├── hpa.yaml               # Horizontal Pod Autoscaler
│   └── network-policy.yaml    # Network segmentation
└── README.md                  # This file
```

---

## 🔐 Security Features

### Built-in Security Controls:

1. **Authentication**:
   - API key-based authentication
   - JWT token support
   - Secure password hashing (bcrypt)

2. **Rate Limiting**:
   - Per-IP rate limiting (100 req/15min)
   - Per-endpoint rate limiting
   - Burst protection

3. **Security Headers**:
   - `Content-Security-Policy`
   - `Strict-Transport-Security` (HSTS)
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `X-XSS-Protection`
   - `Referrer-Policy`

4. **Container Security**:
   - Non-root user (UID 1001)
   - Read-only root filesystem
   - No privilege escalation
   - All capabilities dropped
   - Seccomp profile applied

5. **Network Security**:
   - Kubernetes NetworkPolicies
   - Ingress/egress controls
   - Pod-to-pod encryption ready

6. **Audit Trail**:
   - Structured logging (JSON)
   - Immutable audit logs
   - PostgreSQL audit tables
   - Request/response logging

---

## 📊 Architecture

```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
┌──────▼───────────────┐
│  Nginx Ingress       │  ← TLS termination, rate limiting
│  (or Load Balancer)  │
└──────┬───────────────┘
       │
┌──────▼───────────────┐
│  API Service         │  ← 3+ replicas, auto-scaling
│  (Node.js/Express)   │
└──────┬───┬───────────┘
       │   │
       │   └──────────┐
       │              │
┌──────▼──────┐  ┌───▼─────────┐
│ PostgreSQL  │  │   Redis     │
│ (Persistent)│  │  (Cache)    │
└─────────────┘  └─────────────┘
```

---

## 🔧 Configuration

### Environment Variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | Yes | `production` |
| `PORT` | API port | Yes | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |
| `JWT_SECRET` | Secret for JWT signing | Yes | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | `*` |
| `STRIPE_SECRET_KEY` | Stripe API key | No | - |
| `LOG_LEVEL` | Logging level | No | `info` |

---

## 📈 Monitoring & Observability

### Health Endpoints:

- `GET /health` - Liveness probe (returns 200 if running)
- `GET /ready` - Readiness probe (checks DB + Redis connectivity)

### Logs:

All logs are structured JSON with fields:
- `timestamp` (ISO 8601)
- `level` (info, warn, error)
- `event` (api_request, api_key_validated, quota_exceeded, etc.)
- `customer_id`
- `ip`
- `req.method`
- `req.url`
- `res.statusCode`

### Audit Trail Tables:

- `audit_logs` - All API requests and admin actions
- `usage_logs` - Monthly usage aggregation
- `security_events` - Failed auth attempts, rate limiting, anomalies
- `payments` - Payment transactions (Stripe integration)

---

## 🧪 Testing

```bash
# Run tests
npm test

# Build Docker image
npm run docker:build

# Run locally
npm run docker:run

# Deploy to Kubernetes
npm run k8s:deploy
```

---

## 🔄 API Endpoints

### Authentication:
- `POST /api/auth/register` - Create new API key

### Password Checking:
- `POST /api/v1/check-password` - Tier 1: Basic password strength
- `POST /api/v1/quantum-estimate` - Tier 2: Quantum resistance estimate

### Account Management:
- `GET /api/dashboard/usage` - Get usage statistics

### Health:
- `GET /health` - Health check
- `GET /ready` - Readiness check

---

## 💰 Pricing Tiers (Configurable)

| Tier | Price | Tier 1 Quota | Tier 2 Quota | Overage |
|------|-------|--------------|--------------|---------|
| Free | $0/mo | 25 req/mo | - | Blocked |
| Standard | $19/mo | 3,000 req/mo | - | $0.09/req |
| Quantum Monthly | $150/mo | 15,000 req/mo | 1,500 req/mo | $0.09/req |
| Quantum Pay-Per-Use | - | - | Unlimited | $1.00/req |

---

## 🛡️ SOC 2 Type 2 Compliance Checklist

### ✅ Implemented in Self-Hosted Version:

- [x] Access controls (API keys, role-based)
- [x] Audit logging (comprehensive, immutable)
- [x] Encryption at rest (PostgreSQL)
- [x] Encryption in transit (TLS 1.2/1.3)
- [x] Network segmentation (Kubernetes NetworkPolicies)
- [x] Security headers (OWASP recommendations)
- [x] Rate limiting (DDoS protection)
- [x] Resource limits (CPU/memory quotas)
- [x] Non-root containers
- [x] Health monitoring
- [x] Graceful shutdown
- [x] Multi-replica deployment
- [x] Auto-scaling (HPA)

### 📋 Your Responsibility (Organizational Controls):

- [ ] Information Security Policy
- [ ] Incident Response Plan
- [ ] Business Continuity/Disaster Recovery Plan
- [ ] Background checks for employees
- [ ] Security awareness training
- [ ] Vendor management program
- [ ] Change management procedures
- [ ] Annual penetration testing
- [ ] Quarterly vulnerability scanning
- [ ] Access review (quarterly)
- [ ] SOC 2 Type 2 audit engagement

---

## 🚨 Production Deployment Checklist

Before deploying to production:

1. **Secrets**:
   - [ ] Change all default passwords in `k8s/secrets.yaml`
   - [ ] Use your cloud provider's secret manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)
   - [ ] Rotate secrets regularly (90 days recommended)

2. **TLS/SSL**:
   - [ ] Obtain valid TLS certificate (Let's Encrypt or commercial CA)
   - [ ] Configure cert-manager for automatic renewal
   - [ ] Update `k8s/ingress.yaml` with your domain

3. **Database**:
   - [ ] Enable automated backups
   - [ ] Configure point-in-time recovery
   - [ ] Set up read replicas (if needed)
   - [ ] Enable encryption at rest

4. **Monitoring**:
   - [ ] Configure Prometheus/Grafana
   - [ ] Set up alerting (PagerDuty, Opsgenie)
   - [ ] Configure log aggregation (ELK, Splunk, Datadog)
   - [ ] Set up uptime monitoring

5. **Networking**:
   - [ ] Configure firewall rules
   - [ ] Set up WAF (Web Application Firewall)
   - [ ] Enable DDoS protection
   - [ ] Configure CDN (if serving static assets)

6. **Compliance**:
   - [ ] Review audit logs regularly
   - [ ] Document security procedures
   - [ ] Conduct security training
   - [ ] Schedule penetration testing

---

## 📞 Support

For questions or issues with the self-hosted version:

- **Email**: support@mypasswordchecker.com
- **Documentation**: See `docs/` directory
- **Security Issues**: security@mypasswordchecker.com (PGP key available)

---

## 📜 License

Copyright © 2024 MyPasswordChecker.com. All rights reserved.

This self-hosted version is provided under commercial license. Contact sales@mypasswordchecker.com for licensing details.

---

## 🎯 Next Steps

1. **Quick Test**: Run `docker-compose up` to test locally
2. **Production Deploy**: Follow Kubernetes deployment guide above
3. **Security Hardening**: Review `SECURITY_HARDENING.md`
4. **SOC 2 Compliance**: See `SOC2_COMPLIANCE_ROADMAP.md`
5. **Terraform Deployment**: See `terraform/aws/README.md` for AWS deployment

---

**Made with ❤️ for enterprises requiring SOC 2 Type 2 compliance**
