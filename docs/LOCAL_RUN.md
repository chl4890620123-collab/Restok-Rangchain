# Restok Local Run Guide

Restok은 두 가지 방식으로 로컬 실행할 수 있습니다.

- **권장: Docker Compose 전체 실행** - MariaDB, Spring Boot, FastAPI AI, React/Nginx를 한 번에 실행
- **개발: DB/AI만 Docker + Spring/React 직접 실행** - IDE 디버깅이 필요할 때 사용

## 1. 최초 환경 설정

PowerShell에서 저장소 루트 기준:

```powershell
Copy-Item .env.example .env
```

`.env`에서 최소 다음 값을 확인합니다.

```dotenv
DB_PASSWORD=change_me
DB_ROOT_PASSWORD=change_root_password
JWT_SECRET=change_me_to_a_long_random_secret_1234567890
```

영수증 분석과 AI 보조까지 사용할 경우에만 Gemini 키를 넣습니다.

```dotenv
GEMINI_API_KEY=...
```

Google OAuth는 선택 기능입니다. 기본 로컬 로그인은 아이디/비밀번호 방식으로 동작합니다.

## 2. Docker Compose 전체 실행

```powershell
docker compose up -d --build
```

상태 확인:

```powershell
docker compose ps
```

백엔드 연결 확인:

```powershell
Invoke-RestMethod http://localhost/api/auth/health
```

정상 응답 예시:

```json
{
  "status": "ok",
  "service": "restok-backend"
}
```

AI 서버 확인:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Gemini 키가 없으면 `degraded`, 키가 있으면 `ok`가 표시됩니다. AI가 비활성이어도 로그인, URL 연결, 물품, Lifecycle 기능은 사용할 수 있습니다.

웹 화면:

```text
http://localhost
```

## 3. 로컬 시연 순서

1. 회원가입 후 로그인
2. `URL 연결 관리`에서 판매/기부/재활용/폐기 URL 등록
3. `신규 등록`에서 직접 물품 등록 또는 영수증 AI 분석
4. `대시보드`에서 처리할 물품 확인
5. `처리 기록` → 판매/기부/재활용/폐기/수리 선택
6. `처리·생애주기`에서 이력 확인
7. AI 키가 있다면 `AI 보조`에서 현재 보유 물품과 최근 실제 처리 이력을 기반으로 질문

### 확인해야 할 동작

- 수리(`REPAIRED`)는 Lifecycle 이력만 생성하고 재고 수량을 줄이지 않음
- 판매/기부/재활용/폐기/사용완료/이관은 처리 수량만큼 재고 감소
- 수량이 0이 된 물품은 일반 보유 목록에서 사라지고 Lifecycle 이력에는 남음
- 만료 자동 처리는 데이터를 삭제하지 않고 `AUTO_EXPIRED` 이벤트로 남김
- 오입력 완전 삭제도 `REMOVED` 감사 이력을 남김
- 영수증 일괄등록에서도 URL Connector를 선택하거나 직접 URL을 입력할 수 있음

## 4. 개발 모드: Spring/React 직접 실행

MariaDB와 AI 서버만 Docker로 실행:

```powershell
docker compose up -d mariadb ai-server
```

호스트에서 접근 가능한 주소:

```text
MariaDB: 127.0.0.1:3308
AI:      127.0.0.1:8000
```

### Backend

PowerShell에 환경변수를 설정한 뒤 실행합니다.

```powershell
$env:DB_USERNAME="restok"
$env:DB_PASSWORD="change_me"
$env:JWT_SECRET="change_me_to_a_long_random_secret_1234567890"
$env:GEMINI_API_KEY=""
$env:APP_CORS_ALLOWED_ORIGINS="http://localhost:3000"

cd backend
./gradlew bootRun
```

### Frontend

새 터미널에서:

```powershell
cd frontend
npm ci
npm start
```

`frontend/package.json`의 proxy가 `/api` 요청을 `http://localhost:8080`으로 전달합니다.

웹 화면:

```text
http://localhost:3000
```

## 5. Google OAuth 활성화

`.env`에서 다음을 설정합니다.

```dotenv
SPRING_PROFILES_ACTIVE=oauth
REACT_APP_GOOGLE_OAUTH_ENABLED=true
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Docker Compose를 다시 생성합니다.

```powershell
docker compose up -d --build
```

Google OAuth를 사용하지 않을 때는 위 값을 비워두고 `REACT_APP_GOOGLE_OAUTH_ENABLED=false`를 유지합니다.

## 6. 로그 확인

```powershell
docker compose logs -f backend
```

```powershell
docker compose logs -f ai-server
```

```powershell
docker compose logs -f frontend
```

## 7. 종료 / 초기화

서비스만 종료:

```powershell
docker compose down
```

DB와 업로드 데이터까지 완전히 초기화:

```powershell
docker compose down -v
```

`down -v`는 저장 데이터를 삭제하므로 테스트 초기화가 필요할 때만 사용합니다.
