# 계획서 3: 인프라

## 목표
에이전틱 OS를 프로덕션 환경에 안정적으로 배포하고 운영할 수 있는 인프라를 구축한다.

## 기간: 3주 (Week 7-9)

---

## Phase 1: CI/CD 파이프라인 (Week 7)

### 1.1 GitHub Actions 워크플로우

**`.github/workflows/ci.yml`**:
```yaml
name: AIOS v2 CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '10'

jobs:
  # 1. 린트 & 타입 체크
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  # 2. 단위 테스트
  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: aios_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/aios_test
          REDIS_URL: redis://localhost:6379
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # 3. 빌드
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  # 4. Docker 이미지 빌드 (main 브랜치만)
  docker:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # 5. Staging 배포 (main 브랜치)
  deploy-staging:
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: |
          ssh ${{ secrets.STAGING_SSH }} << 'EOF'
            cd /opt/aios-v2
            docker compose pull
            docker compose up -d
            docker compose exec -T api npx prisma migrate deploy
          EOF

  # 6. 프로덕션 배포 (수동 승인)
  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: |
          ssh ${{ secrets.PRODUCTION_SSH }} << 'EOF'
            cd /opt/aios-v2
            docker compose pull
            docker compose up -d
            docker compose exec -T api npx prisma migrate deploy
          EOF
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| GitHub Actions 워크플로우 | `.github/workflows/ci.yml` | 3시간 |
| Docker 이미지 빌드 | `Dockerfile` (멀티스테이지) | 2시간 |
| Secret 설정 | GitHub Secrets | 1시간 |
| 테스트 커버리지 리포트 | Codecov 연동 | 1시간 |

### 1.2 브랜치 전략

```
main (프로덕션)
  ↑
develop (스테이징)
  ↑
feature/* (기능 개발)
  ↑
hotfix/* (긴급 수정)
```

**브랜치 규칙**:
- `main`: 프로덕션 배포, 직접 푸시 금지
- `develop`: 스테이징 배포, PR로만 병합
- `feature/*`: 기능 개발, develop로 PR
- `hotfix/*`: 긴급 수정, main으로 직접 PR

---

## Phase 2: Staging 환경 (Week 8)

### 2.1 환경 구성

**Staging vs Production**:
| 항목 | Staging | Production |
|------|---------|------------|
| DB | PostgreSQL (staging) | PostgreSQL (production) |
| Redis | Redis (staging) | Redis (production) |
| API | staging.aios.example.com | api.aios.example.com |
| Web | staging-app.aios.example.com | app.aios.example.com |
| 데이터 | 테스트 데이터 | 실제 데이터 |
| 로그 | 상세 로그 | 에러만 |

### 2.2 Docker Compose Staging

**`docker-compose.staging.yml`**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: aios_staging
      POSTGRES_PASSWORD: ${STAGING_DB_PASSWORD}
      POSTGRES_DB: aios_v2_staging
    volumes:
      - staging_postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aios_staging"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - staging_redis:/data

  api:
    image: ghcr.io/${GITHUB_REPOSITORY}:latest
    environment:
      NODE_ENV: staging
      DATABASE_URL: postgresql://aios_staging:${STAGING_DB_PASSWORD}@postgres:5432/aios_v2_staging
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: debug
    depends_on:
      postgres:
        condition: service_healthy

  web:
    image: ghcr.io/${GITHUB_REPOSITORY}:latest
    environment:
      NODE_ENV: staging
      NEXT_PUBLIC_API_URL: https://staging.aios.example.com
    command: pnpm --filter @aios/web start

  # 모니터링
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.staging.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - staging_grafana:/var/lib/grafana
      - ./monitoring/grafana-dashboard.json:/etc/grafana/provisioning/dashboards/dashboard.json
    ports:
      - "3001:3000"

volumes:
  staging_postgres:
  staging_redis:
  staging_grafana:
```

### 2.3 환경 변수 관리

**`.env.staging`**:
```bash
# Database
STAGING_DB_PASSWORD=staging_secure_password
DATABASE_URL=postgresql://aios_staging:${STAGING_DB_PASSWORD}@postgres:5432/aios_v2_staging

# Redis
REDIS_URL=redis://redis:6379

# Auth
NEXTAUTH_SECRET=staging_nextauth_secret
NEXTAUTH_URL=https://staging-app.aios.example.com

# Graph API (Staging Azure AD)
AZURE_CLIENT_ID=staging_client_id
AZURE_CLIENT_SECRET=staging_client_secret

# Logging
LOG_LEVEL=debug
GLITCHTIP_DSN=https://staging_glitchtip_dsn
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| Staging 서버 프로비저닝 | 서버 설정 | 2시간 |
| Docker Compose Staging | `docker-compose.staging.yml` | 2시간 |
| SSL 인증서 | Let's Encrypt | 1시간 |
| DNS 설정 | staging.aios.example.com | 1시간 |
| 환경 변수 | `.env.staging` | 1시간 |

---

## Phase 3: 프로덕션 Docker Compose (Week 8-9)

### 3.1 프로덕션 설정

**`docker-compose.production.yml`**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: aios
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: aios_v2
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aios"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'
    restart: unless-stopped

  api:
    image: ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://aios:${DB_PASSWORD}@postgres:5432/aios_v2
      REDIS_URL: redis://redis:6379
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      GLITCHTIP_DSN: ${GLITCHTIP_DSN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3200/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'
      replicas: 2
    restart: unless-stopped

  web:
    image: ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG}
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.aios.example.com
    command: pnpm --filter @aios/web start
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    restart: unless-stopped

  # 백업 서비스
  backup:
    image: prodrigestivill/postgres-backup-local:16
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: aios_v2
      POSTGRES_USER: aios
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
    volumes:
      - ./backups:/backups
    depends_on:
      - postgres

  # 로그 수집
  loki:
    image: grafana/loki:latest
    volumes:
      - loki_data:/loki
    ports:
      - "3100:3100"

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./monitoring/promtail.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

volumes:
  postgres_data:
  redis_data:
  loki_data:
```

### 3.2 백업 전략

**자동 백업**:
| 백업 유형 | 주기 | 보관 기간 | 저장소 |
|----------|------|----------|--------|
| DB 백업 | 매일 | 7일 | 로컬 |
| DB 백업 | 매주 | 4주 | 로컬 |
| DB 백업 | 매월 | 6개월 | S3 |
| Redis 스냅샷 | 매일 | 3일 | 로컬 |

**백업 복구 절차**:
```bash
#!/bin/bash
# scripts/restore-backup.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-backup.sh <backup_file>"
  exit 1
fi

echo "=== DB 복구 시작 ==="

# 1. 서비스 중지
docker compose stop api web

# 2. DB 복구
docker compose exec -T postgres psql -U aios -d aios_v2 < $BACKUP_FILE

# 3. 서비스 재시작
docker compose start api web

echo "=== DB 복구 완료 ==="
```

### 3.3 보안 강화

**네트워크 보안**:
```yaml
# docker-compose.production.yml에 추가
networks:
  internal:
    driver: bridge
    internal: true  # 외부 접근 차단
  external:
    driver: bridge

services:
  postgres:
    networks:
      - internal  # DB는 내부 네트워크만

  redis:
    networks:
      - internal  # Redis는 내부 네트워크만

  api:
    networks:
      - internal
      - external  # API는 외부 접근 가능
```

**방화벽 규칙**:
| 포트 | 서비스 | 접근 허용 |
|------|--------|----------|
| 80 | HTTP (Nginx) | 모든 IP |
| 443 | HTTPS (Nginx) | 모든 IP |
| 3200 | API | Nginx에서만 |
| 3000 | Web | Nginx에서만 |
| 5432 | PostgreSQL | 내부만 |
| 6379 | Redis | 내부만 |

**Nginx 리버스 프록시**:
```nginx
# /etc/nginx/sites-available/aios
server {
    listen 443 ssl http2;
    server_name api.aios.example.com;

    ssl_certificate /etc/letsencrypt/live/api.aios.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.aios.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name app.aios.example.com;

    ssl_certificate /etc/letsencrypt/live/app.aios.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.aios.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| 프로덕션 Docker Compose | `docker-compose.production.yml` | 3시간 |
| Nginx 설정 | `nginx/sites-available/aios` | 2시간 |
| SSL 인증서 | Let's Encrypt 자동 갱신 | 1시간 |
| 백업 스크립트 | `scripts/backup.sh`, `scripts/restore.sh` | 2시간 |
| 방화벽 설정 | UFW 규칙 | 1시간 |
| 로그 수집 | Loki + Promtail | 2시간 |

---

## Phase 4: 보안 강화 (Week 9)

### 4.1 Secret 관리

**환경 변수 암호화**:
```bash
# .env.production (암호화)
DB_PASSWORD=ENC[AES256_GCM:iv=...,tag=...,ciphertext=...]
NEXTAUTH_SECRET=ENC[AES256_GCM:iv=...,tag=...,ciphertext=...]
AZURE_CLIENT_SECRET=ENC[AES256_GCM:iv=...,tag=...,ciphertext=...]
```

**도구**: SOPS (Secrets OPerationS)
```bash
# Secret 암호화
sops --encrypt --in-place .env.production

# Secret 복호화 (배포 시)
sops --decrypt .env.production > .env
```

### 4.2 API 보안

**Rate Limiting**:
```typescript
// packages/api/src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 100 요청
  message: 'Too many requests, please try again later.',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 로그인 시도 5회
  message: 'Too many login attempts.',
});
```

**CORS 설정**:
```typescript
// packages/api/src/middleware/cors.ts
export const corsOptions = {
  origin: [
    'https://app.aios.example.com',
    'https://staging-app.aios.example.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400,
};
```

**감사 로그**:
```typescript
// packages/api/src/middleware/audit.ts
export function auditLog(req, res, next) {
  const log = {
    timestamp: new Date().toISOString(),
    userId: req.user?.id,
    action: `${req.method} ${req.path}`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    statusCode: res.statusCode,
  };
  
  // DB에 감사 로그 저장
  prisma.auditLog.create({ data: log });
  
  next();
}
```

### 4.3 모니터링 알림

**알림 채널**:
| 채널 | 용도 | 알림 기준 |
|------|------|----------|
| Slack | 일상 알림 | 정보성, 경고 |
| 이메일 | 중요 알림 | 에러, 장애 |
| PagerDuty | 긴급 알림 | 시스템 다운 |

**알림 규칙**:
```yaml
# monitoring/alerts.yml
groups:
  - name: aios-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(aios_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(aios_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space is low"
```

**필요 작업**:
| 작업 | 산출물 | 예상 시간 |
|------|--------|----------|
| SOPS 설정 | `.sops.yaml` | 1시간 |
| Rate Limiting | 미들웨어 | 2시간 |
| CORS 설정 | 미들웨어 | 1시간 |
| 감사 로그 | DB + API | 2시간 |
| 알림 규칙 | `monitoring/alerts.yml` | 2시간 |
| Slack 연동 | 웹훅 설정 | 1시간 |

---

## 예상 총 기간: 3주

| 주차 | 작업 | 핵심 산출물 |
|------|------|------------|
| Week 7 | CI/CD | GitHub Actions 자동 배포 |
| Week 8 | Staging + Production | Docker Compose 프로덕션 |
| Week 9 | 보안 | Secret 관리, 알림 |

## 인프라 비용 추정 (월)

| 항목 | 스펙 | 비용 |
|------|------|------|
| 서버 (Staging) | 2 vCPU, 4GB RAM | ~$20 |
| 서버 (Production) | 4 vCPU, 8GB RAM | ~$40 |
| DB 백업 (S3) | 10GB | ~$1 |
| 도메인 | aios.example.com | ~$12/년 |
| SSL | Let's Encrypt | 무료 |
| **합계** | | **~$61/월** |

## 장애 복구 절차

| 장애 유형 | 대응 시간 | 절차 |
|----------|----------|------|
| API 다운 | 5분 | Docker 재시작 |
| DB 장애 | 15분 | 백업에서 복구 |
| Redis 장애 | 5분 | Docker 재시작 |
| 디스크 가득 | 30분 | 로그 정리 + 백업 |
| 보안 사고 | 즉시 | 서비스 중지 + 조사 |
