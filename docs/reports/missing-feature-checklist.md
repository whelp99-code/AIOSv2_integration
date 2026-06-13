# Missing Feature Checklist

> **Note (2026-06-13):** Several items below (UI pages, integration tests, CI) are **partially implemented** since this checklist was written. For current per-product integration status, see [`product-integration-blueprint-status.md`](product-integration-blueprint-status.md). This file remains the v2.0.1 backlog tracker.

## Overview
This document tracks features that were identified during development but deferred to v2.0.1.

## Critical Missing Features

### Database Layer
- [ ] Prisma schema definition
- [ ] Database migrations
- [ ] Repository implementations
- [ ] Connection pooling

### Authentication & Authorization
- [ ] User model
- [ ] JWT authentication
- [ ] Role-based access control
- [ ] Session management

### Real GitHub Integration
- [ ] Octokit client setup
- [ ] GitHub API authentication
- [ ] Real branch creation
- [ ] Real PR creation/merge

### UI Layer
- [ ] Next.js pages
- [ ] React components
- [ ] Kanban board UI
- [ ] Dashboard UI

### Testing
- [ ] Unit tests for domain models
- [ ] Unit tests for application services
- [ ] Integration tests
- [ ] E2E tests

### CI/CD
- [ ] GitHub Actions workflows
- [ ] Build automation
- [ ] Test automation
- [ ] Deployment automation

### Monitoring & Observability
- [ ] Langfuse integration
- [ ] Logging system
- [ ] Metrics collection
- [ ] Error tracking

### RAG System
- [ ] LightRAG integration
- [ ] pgvector setup
- [ ] Knowledge graph
- [ ] Context retrieval

## Non-Critical Missing Features

### Documentation
- [ ] API documentation
- [ ] User guide
- [ ] Developer guide
- [ ] Architecture decision records

### Performance
- [ ] Caching layer
- [ ] Database indexing
- [ ] Query optimization
- [ ] Load testing

### Security
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

## Priority Matrix

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| Database Layer | High | Medium | High |
| Authentication | High | Medium | High |
| GitHub Integration | Medium | Low | Medium |
| UI Layer | Medium | High | High |
| Testing | High | Medium | High |
| CI/CD | Medium | Low | Medium |
| Monitoring | Low | Medium | Medium |
| RAG System | Low | High | Medium |

## Recommendation

Focus on the following in v2.0.1:
1. Database layer (Prisma + PostgreSQL)
2. Authentication system
3. Unit tests for existing code
4. Basic UI components
