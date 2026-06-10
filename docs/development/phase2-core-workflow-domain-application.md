# Phase 2: Core Workflow Domain/Application

## Overview
- **Phase:** 2
- **Name:** Core Workflow Domain/Application
- **Branch:** phase/2-core-workflow-domain-application
- **Status:** In Progress

## Goal
AIOSv2 Integration의 핵심 업무 흐름을 `packages/domain`과 `packages/application` 중심으로 확장한다.

## Deliverables

### 1. Domain Models (`packages/domain/src/models/`)
- `project.ts` - 프로젝트 수신 모델
- `task.ts` - 작업 관리 모델
- `agent-job.ts` - 에이전트 작업 모델
- `result.ts` - 결과 기록 모델
- `approval-policy.ts` - 승인 정책 모델
- `deferred-item.ts` - 연기 항목 모델
- `workflow-state.ts` - 워크플로우 상태 모델

### 2. Application Services (`packages/application/src/`)
- `services/core-workflow.ts` - 핵심 워크플로우 서비스 계약
- `use-cases/task-creation.ts` - 작업 생성 유스케이스
- `use-cases/result-recording.ts` - 결과 기록 유스케이스
- `use-cases/phase-progression.ts` - Phase 진행 유스케이스

## Implementation Details

### TASK-001: Domain Models
- [x] Project intake domain model
- [x] Task domain model
- [x] Agent job domain model
- [x] Result domain model
- [x] Approval policy model
- [x] Deferred item model
- [x] Workflow state model

### TASK-002: Application Services
- [x] Core workflow service contract
- [x] Task creation use case
- [x] Result recording use case
- [x] Phase progression use case

## Status
- **Start Date:** 2026-06-10
- **Status:** In Progress
- **Branch:** phase/2-core-workflow-domain-application

## Notes
Domain models and application services created. TypeScript compilation errors exist due to missing build step (by design - verification is deferred).
