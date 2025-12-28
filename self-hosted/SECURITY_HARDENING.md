# Security Hardening Guide
## MyPasswordChecker.com Self-Hosted Edition

This guide provides step-by-step security hardening instructions for production deployments.

---

## 🎯 Security Checklist

Use this checklist before going to production:

- [ ] All default passwords changed
- [ ] Secrets stored in secret manager (not files)
- [ ] TLS/SSL certificates configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Database encryption enabled
- [ ] Backups configured and tested
- [ ] Monitoring and alerting set up
- [ ] Network policies applied
- [ ] Container security hardened
- [ ] Penetration testing completed

---

## 1. Secrets Management

### ❌ **NEVER DO THIS**:
```yaml
# DON'T hardcode secrets in Kubernetes manifests
env:
  - name: DATABASE_PASSWORD
    value: "mypassword123"  # ❌ INSECURE
```

### ✅ **DO THIS INSTEAD**:

#### Option A: Kubernetes Secrets (Basic)
```bash
# Create secret from command line
kubectl create secret generic mypasswordchecker-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=postgres-password=$(openssl rand -base64 32) \
  --from-literal=redis-password=$(openssl rand -base64 32) \
  -n mypasswordchecker
```

#### Option B: AWS Secrets Manager (Recommended)
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create ExternalSecret resource
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: mypasswordchecker-secrets
  namespace: mypasswordchecker
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: mypasswordchecker-secrets
  data:
  - secretKey: jwt-secret
    remoteRef:
      key: mypasswordchecker/jwt-secret
  - secretKey: postgres-password
    remoteRef:
      key: mypasswordchecker/postgres-password
EOF
```

#### Option C: Sealed Secrets (GitOps-friendly)
```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
brew install kubeseal

# Create sealed secret
kubectl create secret generic mypasswordchecker-secrets \
  --dry-run=client \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Safe to commit sealed-secret.yaml to git
kubectl apply -f sealed-secret.yaml
```

---

## 2. TLS/SSL Configuration

### Certificate Management

#### Option A: Let's Encrypt (Free, Automated)
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update ingress to use cert-manager
# (Already configured in k8s/ingress.yaml)
```

#### Option B: Commercial Certificate
```bash
# Create secret from certificate files
kubectl create secret tls mypasswordchecker-tls \
  --cert=path/to/cert.crt \
  --key=path/to/cert.key \
  -n mypasswordchecker
```

### TLS Configuration Best Practices

Update `nginx.conf` or Ingress annotations:

```nginx
# Disable old TLS versions
ssl_protocols TLSv1.2 TLSv1.3;

# Strong cipher suites only
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

# Prefer server ciphers
ssl_prefer_server_ciphers on;

# Enable OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;

# HSTS (force HTTPS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

## 3. Database Security

### PostgreSQL Hardening

#### Enable Encryption at Rest

**AWS RDS:**
```terraform
resource "aws_db_instance" "postgres" {
  storage_encrypted = true
  kms_key_id        = aws_kms_key.db_encryption.arn

  # Additional security
  backup_retention_period = 30
  deletion_protection     = true
  enabled_cloudwatch_logs_exports = ["postgresql"]
}
```

**Self-Managed:**
```bash
# Enable pgcrypto extension
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Encrypt sensitive columns
ALTER TABLE api_keys
  ALTER COLUMN api_key TYPE bytea
  USING pgp_sym_encrypt(api_key, 'encryption-key');
```

#### Network Security
```yaml
# PostgreSQL should only accept connections from API pods
# Already configured in k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-network-policy
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: mypasswordchecker-api
    ports:
    - protocol: TCP
      port: 5432
```

#### Connection Security
```javascript
// Enforce SSL connections in application code
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  }
});
```

### Redis Hardening

```bash
# Require password
redis-server --requirepass "$(cat /run/secrets/redis-password)"

# Disable dangerous commands
redis-cli CONFIG SET rename-command FLUSHDB ""
redis-cli CONFIG SET rename-command FLUSHALL ""
redis-cli CONFIG SET rename-command CONFIG ""

# Enable TLS (Redis 6+)
redis-server \
  --tls-port 6379 \
  --port 0 \
  --tls-cert-file /path/to/redis.crt \
  --tls-key-file /path/to/redis.key \
  --tls-ca-cert-file /path/to/ca.crt
```

---

## 4. Container Security

### Dockerfile Hardening

```dockerfile
# Use specific version tags (not "latest")
FROM node:18.19.0-alpine3.19

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
COPY --chown=nodejs:nodejs . /app

# Switch to non-root user
USER nodejs

# Drop all capabilities
# (Configure in Kubernetes securityContext)
```

### Kubernetes Security Context

```yaml
# Already configured in k8s/deployment.yaml
securityContext:
  # Pod-level
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
  seccompProfile:
    type: RuntimeDefault

  # Container-level
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1001
  capabilities:
    drop:
      - ALL
```

### Image Scanning

```bash
# Scan images for vulnerabilities
docker scan mypasswordchecker/self-hosted:latest

# Or use Trivy
trivy image mypasswordchecker/self-hosted:latest

# Fail build on HIGH/CRITICAL vulnerabilities
trivy image --exit-code 1 --severity HIGH,CRITICAL mypasswordchecker/self-hosted:latest
```

---

## 5. Network Security

### Kubernetes NetworkPolicies

```bash
# Apply all network policies
kubectl apply -f k8s/network-policy.yaml

# Verify policies are working
kubectl describe networkpolicy -n mypasswordchecker

# Test connectivity (should fail)
kubectl run test-pod --image=busybox --rm -it -- nc -zv postgres 5432
# Expected: Connection refused (blocked by NetworkPolicy)
```

### Firewall Rules

**AWS Security Groups:**
```terraform
resource "aws_security_group" "api" {
  name = "mypasswordchecker-api"

  # Allow HTTPS from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow PostgreSQL only from API security group
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }

  # Deny all other inbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### DDoS Protection

**Cloudflare (if using):**
- Enable "Under Attack Mode" during attacks
- Configure rate limiting rules
- Enable Bot Fight Mode

**AWS Shield:**
```terraform
resource "aws_shield_protection" "api" {
  name         = "mypasswordchecker-api"
  resource_arn = aws_lb.main.arn
}
```

---

## 6. Application Security

### Rate Limiting

Update `server.js`:

```javascript
const rateLimit = require('express-rate-limit');

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/', authLimiter);

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
});

app.use('/api/', apiLimiter);
```

### Input Validation

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/v1/check-password', [
  // Validate and sanitize inputs
  body('password')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Password must be between 1 and 1000 characters'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Process validated input
});
```

### Security Headers

Already configured in `server.js` with helmet:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));
```

---

## 7. Monitoring & Alerting

### Security Event Monitoring

```javascript
// Log security events
logger.warn({
  event: 'failed_authentication',
  customer_id: apiKey.substring(0, 10),
  ip: req.ip,
  user_agent: req.headers['user-agent']
});

// Insert into security_events table
await pool.query(
  `INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
   VALUES ($1, $2, $3, $4, $5)`,
  ['failed_auth', 'medium', req.ip, 'Invalid API key', { apiKey: apiKey.substring(0, 10) }]
);
```

### Alert Rules

**Prometheus AlertManager:**

```yaml
groups:
- name: security
  rules:
  - alert: HighFailedAuthRate
    expr: rate(failed_auth_total[5m]) > 10
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High failed authentication rate detected"
      description: "{{ $value }} failed auth attempts per second"

  - alert: DatabaseConnectionFailure
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "PostgreSQL is down"

  - alert: HighMemoryUsage
    expr: container_memory_usage_bytes{pod=~"mypasswordchecker-api.*"} > 450000000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage on API pod"
```

---

## 8. Backup & Disaster Recovery

### PostgreSQL Backups

```bash
# Automated daily backups
kubectl create cronjob postgres-backup \
  --image=postgres:15-alpine \
  --schedule="0 2 * * *" \
  --restart=Never \
  -- /bin/sh -c "pg_dump -h postgres -U postgres mypasswordchecker | gzip > /backups/backup-$(date +%Y%m%d).sql.gz"

# Encrypt backups
gpg --encrypt --recipient admin@yourdomain.com backup.sql.gz

# Upload to S3
aws s3 cp backup.sql.gz.gpg s3://mypasswordchecker-backups/$(date +%Y%m%d)/
```

### Test Recovery

```bash
# Test restore monthly
gunzip < backup.sql.gz | psql -h postgres-test -U postgres mypasswordchecker

# Verify data integrity
psql -h postgres-test -U postgres -c "SELECT COUNT(*) FROM api_keys;"
```

---

## 9. Access Control

### SSH Bastion

```bash
# Never allow direct SSH to production servers
# Use bastion host with MFA

# AWS Systems Manager Session Manager (no SSH keys needed)
aws ssm start-session --target i-1234567890abcdef0

# Or configure bastion with MFA
# /etc/ssh/sshd_config
AuthenticationMethods publickey,keyboard-interactive
ChallengeResponseAuthentication yes
```

### Kubernetes RBAC

```yaml
# Least privilege for developers
apiVersion: rbac.authorization.k8s.io/v1
kind:Role
metadata:
  name: developer
  namespace: mypasswordchecker
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list"]

# Admin access only for specific users
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: User
  name: jack@aac2.com
```

---

## 10. Compliance & Audit

### Audit Log Retention

```sql
-- Ensure logs are retained for 7 years (SOC 2 requirement)
CREATE TABLE audit_logs_archive AS SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- Move to cold storage (S3 Glacier)
pg_dump -t audit_logs_archive | gzip | aws s3 cp - s3://mypasswordchecker-audit-archive/$(date +%Y)/
```

### Regular Security Reviews

```bash
# Monthly security scan checklist
- [ ] Run vulnerability scan (Trivy/Snyk)
- [ ] Review failed authentication logs
- [ ] Review security_events table
- [ ] Check certificate expiration dates
- [ ] Review access logs for anomalies
- [ ] Test backup restoration
- [ ] Review and rotate secrets (if older than 90 days)
- [ ] Review user access (remove inactive users)
```

---

## 11. Incident Response

### Security Incident Playbook

**1. Detection**
- Monitor alerts from Prometheus/Datadog
- Review security_events table daily
- Check for anomalous API usage patterns

**2. Containment**
- Revoke compromised API keys immediately
- Block malicious IPs in NetworkPolicy
- Isolate affected pods (scale to 0)

**3. Investigation**
```sql
-- Check for suspicious activity
SELECT * FROM audit_logs
WHERE ip_address = '1.2.3.4'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Find all API keys used from suspicious IP
SELECT DISTINCT customer_id FROM audit_logs
WHERE ip_address = '1.2.3.4';
```

**4. Remediation**
- Patch vulnerabilities
- Reset compromised credentials
- Update firewall rules

**5. Recovery**
- Restore from backup if needed
- Verify data integrity
- Resume normal operations

**6. Post-Incident**
- Document incident timeline
- Update runbooks
- Conduct blameless postmortem

---

## 12. Security Scanning

### Automated Scanning in CI/CD

```yaml
# GitHub Actions example
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    # Dependency scanning
    - name: Run Snyk
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

    # Container scanning
    - name: Build image
      run: docker build -t mypasswordchecker:test .

    - name: Run Trivy
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: mypasswordchecker:test
        severity: 'CRITICAL,HIGH'
        exit-code: '1'

    # Code scanning
    - name: Run CodeQL
      uses: github/codeql-action/analyze@v2
```

---

## 13. Penetration Testing

### Before Production Launch

Hire a third-party to conduct:
- External penetration testing
- Internal penetration testing
- API security testing
- Social engineering assessment

**Recommended Firms**:
- Cobalt
- Bugcrowd
- HackerOne
- Bishop Fox
- NCC Group

**Cost**: $15,000 - $30,000

---

## Security Checklist Summary

### Pre-Production:
- [ ] All secrets in secret manager
- [ ] TLS certificates configured
- [ ] Database encryption enabled
- [ ] Backups configured and tested
- [ ] Monitoring and alerting active
- [ ] Network policies applied
- [ ] Container security hardened
- [ ] Penetration testing completed
- [ ] Incident response plan documented

### Ongoing:
- [ ] Monthly vulnerability scans
- [ ] Quarterly access reviews
- [ ] Annual penetration testing
- [ ] Daily audit log review
- [ ] Weekly backup verification
- [ ] 90-day secret rotation

---

**Questions?** Contact: security@mypasswordchecker.com
