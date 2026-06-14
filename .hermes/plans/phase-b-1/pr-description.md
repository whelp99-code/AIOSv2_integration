# PR Description — Phase B-1 DB 마이그레이션

## Overview

DB 마이그레이션 통합 스키마 도입 및 마이그레이션/롤백/백업/테스트 정합화.

## Summary

- AIOS v1/F-aios-v3 → 통합 Prisma 스키마 정비
- 마이그레이션 스크립트 트랜잭션 + 배치 + dry-run/confirm 지원
- 롤백 시 원본 userId 복원
- OAuth 토큰 암호화, 테넌트 자동 격리 미들웨어 도입
- 구조화 로그/PostgreSQL advisory lock 도입
- 테스트 48건 통과

## Checklist

- [x] 스키마 충돌 파일 정리 (schema 2.prisma 삭제)
- [x] 마이그레이션 dry-run/confirm 모드
- [x] 롤백 원본 데이터 복원 기능
- [x] OAuth 토큰 암호화 적용
- [x] 테넌트 격리 Prisma 미들웨어
- [x] 테스트 통과 (pnpm test / pnpm typecheck)
