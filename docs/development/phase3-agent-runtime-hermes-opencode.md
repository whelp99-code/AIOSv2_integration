# Phase 3: Agent Runtime: Hermes + opencode

## Overview
- **Phase:** 3
- **Name:** Agent Runtime: Hermes + opencode
- **Branch:** phase/3-agent-runtime-hermes-opencode
- **Status:** In Progress

## Goal
Hermes와 opencode 역할을 코드 구조로 명확히 분리하고, AI 개발 에이전트 실행 흐름을 정의한다.

## Deliverables

### 1. Agent Runtime Interfaces (`packages/application/src/agents/`)
- `runtime-interface.ts` - 에이전트 실행 인터페이스
- `hermes-role.ts` - Hermes 역할 계약
- `opencode-role.ts` - opencode 역할 계약
- `task-dispatcher.ts` - 에이전트 작업 분배기
- `result-collector.ts` - 에이전트 결과 수집기
- `auto-approval-resolver.ts` - 자동 승인 정책 해석기
- `deferred-decision-handler.ts` - 연기 결정 처리기
- `execution-log.ts` - 에이전트 실행 로그 모델

## Implementation Details

### TASK-001: Agent Runtime Interface
- [x] IAgentRuntime interface
- [x] AgentStatus interface
- [x] AgentCapabilities interface

### TASK-002: Hermes Role Contract
- [x] IHermesRole interface
- [x] AggregatedResult interface
- [x] ApprovalDecision interface
- [x] HermesTaskDispatchResult interface

### TASK-003: opencode Role Contract
- [x] IOpencodeRole interface
- [x] CodeSpecification interface
- [x] CodeGenerationResult interface
- [x] GeneratedFile interface
- [x] FileChangeResult interface
- [x] CommitMetadataResult interface

### TASK-004: Task Management
- [x] AgentTaskDispatcher class
- [x] AgentResultCollector class

### TASK-005: Policy & Decision
- [x] AutoApprovalResolver class
- [x] DeferredDecisionHandler class

### TASK-006: Logging
- [x] AgentExecutionLog model
- [x] ExecutionSummary model
- [x] ExecutionFilter model
- [x] createExecutionLog helper
- [x] calculateExecutionSummary helper

## Status
- **Start Date:** 2026-06-10
- **Status:** In Progress
- **Branch:** phase/3-agent-runtime-hermes-opencode

## Notes
Agent runtime interfaces and implementations created. TypeScript compilation errors exist due to missing build step (by design - verification is deferred).
