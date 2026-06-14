# PR Description — Phase A-3 VibeCodingOS API 계약 확정

## Summary

Phase A-3은 **VibeCodingOS API 계약 확정**을 목표로 하며, OpenAPI 스펙 작성,
API 키 기반 인증 미들웨어, 통합 테스트 추가를 포함합니다.

## Changes

- **docs/openapi-vibe-coding.yaml**: VibeCodingOS 전체 API의 OpenAPI 3.0.3 스펙 추가
- **middleware/auth.ts**: `X-API-Key` 헤더 검증 미들웨어 추가 (401 반환)
- **tests/api/projects.test.ts**: Projects API 통합 테스트 (인증 테스트 포함)
- **tests/api/a2a.test.ts**: A2A API 통합 테스트 (인증 테스트 포함)

## Motivation

계약 검토를 통해 현재 구현된 API가 문서화되지 않고 인증이 부족하여, 이번 Phase에서
OpenAPI 스펙과 인증 레이어를 추가하여 API 계약을 확정합니다.

Breaking Change: 인증 미들웨어 추가로 인해, 기존 API 호출 시 `X-API-Key` 헤더가 필요합니다.

## Test Plan

- [ ] `npm run test` 또는 `vitest` 실행
- [ ] Projects API 인증 실패 케이스 확인
- [ ] A2A API 인증 실패 케이스 확인
- [ ] valid API KEY로 200 응답 확인

## Checklist

- [x] OpenAPI 스펙 작성
- [x] 인증 미들웨어 생성
- [x] 테스트 코드 작성
- [x] Red Team 리뷰 완료
- [x] Evidence 검증 완료

##rolled Up Risks

- RCE 벡터 (S-02), 파일 기반 스토어 (A-01), approval 미구현 (R-02) 등은
  Phase A-3 이후 별도 Phase에서 이월됩니다.

## Links

- Phase Plan: `phase-plan-v2.md`
- Test Result: `test-result-report.md`
- Red Team Review: `red-team-review-v1.md`
- Evidence Verification: `hermes-evidence-verification.md`
