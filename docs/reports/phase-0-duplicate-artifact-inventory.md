# Phase 0 Duplicate Artifact Inventory

기준일: 2026-06-14

## 목적

현재 워크트리에 남아 있는 `* 2.*` 미추적 산출물을 삭제하지 않고 분류한다. 이 문서는 Phase 0 기준선 회복을 위한 인벤토리이며, 실제 삭제 또는 `.gitignore` 반영은 별도 승인 후 진행한다.

## 요약

| 분류                                    | 개수 | 상태                  | 기본 처리 기준              |
| --------------------------------------- | ---: | --------------------- | --------------------------- |
| `.hermes/plans/**/* 2.md` 또는 `2.json` |   33 | canonical과 내용 동일 | 삭제 후보. 삭제는 승인 필요 |
| `docs/reports/* 2.md`                   |    1 | canonical과 내용 다름 | 보존/병합 후보              |
| `scripts/* 2.md`                        |    1 | canonical과 내용 다름 | 보존/병합 후보              |
| 전체                                    |   35 | 삭제 없음             | 승인 전 보존                |

## 판단 기준

| 상태                  | 의미                                | 권장 처리                                          |
| --------------------- | ----------------------------------- | -------------------------------------------------- |
| canonical exists: yes | ` 2`가 없는 동일 경로 파일이 존재함 | canonical 파일을 기준으로 두고 `* 2.*`는 비교 대상 |
| canonical exists: no  | 원본 후보가 없음                    | 단순 중복으로 보지 않고 보존 후보                  |
| approval required     | 삭제 또는 ignore 반영 필요          | 사용자 승인 후 처리                                |
| identical             | canonical과 byte-for-byte 동일      | 삭제 후보로 확정하되 실제 삭제는 승인 후 처리      |
| different             | canonical과 내용 차이 존재          | 보존/병합 후보로 분리                              |

## 비교 결과

비교 명령:

```bash
git ls-files --others --exclude-standard | rg '(^\.hermes/plans/.* 2\.(md|json)$|^docs/reports/.* 2\.md$|^scripts/.* 2\.md$)' | while IFS= read -r f; do
  canonical=$(printf '%s' "$f" | sed -E 's/ 2(\.[^.]+)$/\1/')
  if [ ! -e "$canonical" ]; then
    result='missing-canonical'
  elif cmp -s "$canonical" "$f"; then
    result='identical'
  else
    result='different'
  fi
  printf '%s\t%s\t%s\n' "$f" "$canonical" "$result"
done
```

결론:

| 결과              | 개수 | 처리                                  |
| ----------------- | ---: | ------------------------------------- |
| identical         |   33 | 삭제 후보 확정. 실제 삭제는 승인 필요 |
| different         |    2 | 보존/병합 후보                        |
| missing-canonical |    0 | 없음                                  |

## 중복 산출물 후보

| 후보 파일                                                   | canonical 후보                                            | canonical exists | 권장 처리                 |
| ----------------------------------------------------------- | --------------------------------------------------------- | ---------------- | ------------------------- |
| `.hermes/plans/phase-a-1/commit-log 2.md`                   | `.hermes/plans/phase-a-1/commit-log.md`                   | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/fix-summary 2.md`                  | `.hermes/plans/phase-a-1/fix-summary.md`                  | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/gemini-pr-review 2.json`           | `.hermes/plans/phase-a-1/gemini-pr-review.json`           | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/gemini-redteam-review 2.json`      | `.hermes/plans/phase-a-1/gemini-redteam-review.json`      | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/hermes-evidence-verification 2.md` | `.hermes/plans/phase-a-1/hermes-evidence-verification.md` | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/phase-plan-v1 2.md`                | `.hermes/plans/phase-a-1/phase-plan-v1.md`                | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/phase-plan-v2 2.md`                | `.hermes/plans/phase-a-1/phase-plan-v2.md`                | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/pr-description 2.md`               | `.hermes/plans/phase-a-1/pr-description.md`               | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/push-result 2.md`                  | `.hermes/plans/phase-a-1/push-result.md`                  | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/red-team-final-review 2.md`        | `.hermes/plans/phase-a-1/red-team-final-review.md`        | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/secondary-redteam-review 2.md`     | `.hermes/plans/phase-a-1/secondary-redteam-review.md`     | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-1/test-result-report 2.md`           | `.hermes/plans/phase-a-1/test-result-report.md`           | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/commit-log 2.md`                   | `.hermes/plans/phase-a-2/commit-log.md`                   | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/fix-summary 2.md`                  | `.hermes/plans/phase-a-2/fix-summary.md`                  | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/gemini-pr-review 2.json`           | `.hermes/plans/phase-a-2/gemini-pr-review.json`           | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/gemini-redteam-review 2.json`      | `.hermes/plans/phase-a-2/gemini-redteam-review.json`      | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/hermes-evidence-verification 2.md` | `.hermes/plans/phase-a-2/hermes-evidence-verification.md` | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/pr-description 2.md`               | `.hermes/plans/phase-a-2/pr-description.md`               | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/push-result 2.md`                  | `.hermes/plans/phase-a-2/push-result.md`                  | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-a-2/red-team-final-review 2.md`        | `.hermes/plans/phase-a-2/red-team-final-review.md`        | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-4/red-team-review-v1 2.md`           | `.hermes/plans/phase-b-4/red-team-review-v1.md`           | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/commit-log 2.md`                   | `.hermes/plans/phase-b-5/commit-log.md`                   | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/fix-summary 2.md`                  | `.hermes/plans/phase-b-5/fix-summary.md`                  | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/gemini-pr-review 2.json`           | `.hermes/plans/phase-b-5/gemini-pr-review.json`           | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/gemini-redteam-review 2.json`      | `.hermes/plans/phase-b-5/gemini-redteam-review.json`      | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/hermes-evidence-verification 2.md` | `.hermes/plans/phase-b-5/hermes-evidence-verification.md` | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/phase-plan-v2 2.md`                | `.hermes/plans/phase-b-5/phase-plan-v2.md`                | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/pr-description 2.md`               | `.hermes/plans/phase-b-5/pr-description.md`               | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/push-result 2.md`                  | `.hermes/plans/phase-b-5/push-result.md`                  | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/red-team-final-review 2.md`        | `.hermes/plans/phase-b-5/red-team-final-review.md`        | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/red-team-review-v1 2.md`           | `.hermes/plans/phase-b-5/red-team-review-v1.md`           | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/secondary-redteam-review 2.md`     | `.hermes/plans/phase-b-5/secondary-redteam-review.md`     | yes              | identical. 삭제 후보      |
| `.hermes/plans/phase-b-5/test-result-report 2.md`           | `.hermes/plans/phase-b-5/test-result-report.md`           | yes              | identical. 삭제 후보      |
| `docs/reports/codex-cli-command-reference 2.md`             | `docs/reports/codex-cli-command-reference.md`             | yes              | different. 보존/병합 후보 |
| `scripts/codex-cli-command-routing 2.md`                    | `scripts/codex-cli-command-routing.md`                    | yes              | different. 보존/병합 후보 |

## 보존/병합 후보 상세

| 후보 파일                                       | 차이 요약                                                                                                                              | 권장 처리                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `docs/reports/codex-cli-command-reference 2.md` | Cursor Agent 설치 전 상태를 기록한다. canonical 파일은 `agent` 실행 가능 상태를 반영한다.                                              | canonical 유지. `2.md`는 삭제 전 historical snapshot으로 보존 여부 확인 |
| `scripts/codex-cli-command-routing 2.md`        | Cursor Agent 설치 전 routing 기준을 기록한다. canonical 파일은 `pnpm collaboration:dispatch-cursor-agent`와 `agent` 기본값을 반영한다. | canonical 유지. `2.md`는 삭제 전 historical snapshot으로 보존 여부 확인 |

## 자동 진행 가능 작업

| 작업             | 설명                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| 내용 비교        | `diff -u "<canonical>" "<duplicate>"`로 차이 확인                    |
| 보존 후보 표기   | canonical과 내용이 다르면 문서에 보존 이유 기록                      |
| ignore 후보 제안 | macOS 또는 sync 도구가 만드는 반복 패턴이면 `.gitignore` 후보로 제안 |

## 승인 필요 작업

| 작업                | 승인 사유                             |
| ------------------- | ------------------------------------- |
| `* 2.*` 파일 삭제   | 사용자/도구가 생성한 산출물일 수 있음 |
| `.gitignore` 반영   | 향후 산출물 추적 정책에 영향          |
| canonical 파일 대체 | 기존 evidence/history 변경 가능       |

## 다음 단계

1. 33개 identical 항목은 사용자 승인 후 삭제할 수 있다.
2. 2개 different 항목은 canonical이 최신 실행 상태를 반영하므로 삭제 전 historical snapshot 보존 필요 여부를 확인한다.
3. 반복 생성 원인이 macOS/iCloud/sync 도구라면 별도 승인 후 ignore 정책을 검토한다.
