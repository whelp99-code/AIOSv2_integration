# Azure AD 앱 등록 가이드

## 개요
Microsoft Graph API를 사용하여 Outlook 메일을 연동하기 위해 Azure AD 앱을 등록합니다.

---

## 1. Azure Portal 접속

1. [Azure Portal](https://portal.azure.com/) 접속
2. Microsoft 계정으로 로그인

---

## 2. Azure AD 앱 등록

### 2.1 앱 등록 페이지 이동
1. 왼쪽 메뉴에서 **Azure Active Directory** 선택
2. **앱 등록** 클릭
3. **+ 새 등록** 클릭

### 2.2 앱 정보 입력
| 필드 | 값 |
|------|-----|
| 이름 | `AIOS-v2-Mail-Integration` |
| 지원 계정 유형 | `이 조직의 디렉터리에 있는 계정만` |
| 리디렉션 URI | `Web` → `https://your-domain.com/auth/callback` |

4. **등록** 클릭

---

## 3. Client ID 및 Secret 확인

### 3.1 Client ID 확인
1. 앱 등록 완료 후 **개요** 페이지에서
2. **애플리케이션(클라이언트) ID** 복사

### 3.2 Client Secret 생성
1. **인증서 및 비밀번호** 메뉴 클릭
2. **+ 새 클라이언트 비밀번호** 클릭
3. 설명: `AIOS v2 Mail Integration`
4. 만료: `24개월` (또는 필요에 따라)
5. **추가** 클릭
6. 생성된 비밀번호 값 복사 (나중에 표시되지 않음)

---

## 4. API 권한 설정

### 4.1 Microsoft Graph 권한 추가
1. **API 권한** 메뉴 클릭
2. **+ 권한 추가** 클릭
3. **Microsoft Graph** 선택
4. **애플리케이션 권한** 선택

### 4.2 필요한 권한
| 권한 | 설명 | 유형 |
|------|------|------|
| `Mail.Read` | 메일 읽기 | 애플리케이션 |
| `Mail.ReadWrite` | 메일 읽기/쓰기 | 애플리케이션 |
| `User.Read.All` | 모든 사용자 읽기 | 애플리케이션 |

5. 각 권한 선택 후 **권한 추가** 클릭

### 4.3 관리자 동의
1. **관리자 동의 설정** 클릭
2. **{Your Organization}에 대한 관리자 동의 확인** 클릭

---

## 5. 환경 변수 설정

`.env` 파일에 다음 변수를 추가합니다:

```bash
# Azure AD 설정
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_TENANT_ID=your-tenant-id-here

# Graph API 설정
GRAPH_API_REDIRECT_URI=https://your-domain.com/auth/callback
GRAPH_API_SCOPES=Mail.Read Mail.ReadWrite User.Read.All

# 웹훅 설정
WEBHOOK_CLIENT_STATE=aios-webhook-secret
WEBHOOK_NOTIFICATION_URL=https://your-domain.com/webhooks/outlook
```

---

## 6. 웹훅 설정

### 6.1 웹훅 URL 준비
- Public HTTPS URL 필요 (예: `https://your-domain.com/webhooks/outlook`)
- 개발 환경에서는 ngrok 사용 가능:
  ```bash
  ngrok http 3200
  ```

### 6.2 웹훅 구독 생성
API를 통해 웹훅 구독을 생성합니다:
```bash
curl -X POST https://graph.microsoft.com/v1.0/subscriptions \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "changeType": "created",
    "notificationUrl": "https://your-domain.com/webhooks/outlook",
    "resource": "/me/messages",
    "expirationDateTime": "2026-06-26T00:00:00.000Z",
    "clientState": "aios-webhook-secret"
  }'
```

---

## 7. 검증

### 7.1 OAuth 흐름 테스트
```bash
# 1. 인증 URL 생성
curl "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize?client_id={client-id}&response_type=code&redirect_uri={redirect-uri}&scope=Mail.Read&response_mode=query"

# 2. 브라우저에서 열고 로그인
# 3. 리디렉션 후 code 파라미터 확인
# 4. code로 토큰 교환
curl -X POST "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token" \
  -d "client_id={client-id}&client_secret={client-secret}&code={code}&redirect_uri={redirect-uri}&grant_type=authorization_code"
```

### 7.2 웹훅 테스트
1. Outlook에서 테스트 메일 발송
2. 웹훅 URL로 알림 수신 확인
3. 로그에서 분류 결과 확인

---

## 문제 해결

### 일반적인 오류

| 오류 | 원인 | 해결 |
|------|------|------|
| `AADSTS50011` | 리디렉션 URI 불일치 | Azure Portal에서 URI 확인 |
| `AADSTS700016` | 앱 비밀번호 만료 | 새 비밀번호 생성 |
| `Invalid client secret` | 비밀번호 복사 오류 | 새 비밀번호 생성 후 정확히 복사 |
| `Insufficient privileges` | 권한 부족 | API 권한 + 관리자 동의 확인 |

### 웹훅 갱신
- 웹훅 구독은 3일마다 갱신 필요
- `graph-renewal.ts` 스케줄러가 자동으로 처리
- 갱신 실패 시 Telegram 알림 발송

---

## 보안 고려사항

1. **Client Secret 관리**: `.env` 파일에만 저장, Git에 커밋하지 않음
2. **最小 권한 원칙**: 필요한 권한만 부여
3. **토큰 갱신**: 만료 전 자동 갱신 로직 구현됨
4. **웹훅 검증**: `clientState`로 알림 진위 확인
