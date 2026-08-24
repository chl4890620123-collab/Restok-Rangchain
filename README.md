# Restok — URL-first Personal Item Lifecycle Platform

Restok은 단순한 재고관리 앱이 아니라, **물건이 등록된 순간부터 사용·판매·기부·재활용·폐기될 때까지의 생애주기를 관리하는 서비스**입니다.

핵심 설계 원칙은 **사용자가 서비스에 맞추는 것이 아니라, 시스템을 사용자의 물건 관리 방식에 맞추는 것**입니다.

## 문제 정의

기존 외부 서비스 연동은 특정 API가 제공하는 기능과 정책에 종속되기 쉽습니다. 개인마다 실제로 사용하는 판매처, 기부처, 재활용 업체, 폐기 서비스가 다르기 때문에 모든 서비스를 API로 직접 통합하는 방식은 범위와 유지보수 비용에 한계가 있습니다.

Restok은 이를 다음 방식으로 해결합니다.

1. **URL-first Connector**: 사용자가 원하는 외부 서비스를 URL로 직접 등록합니다.
2. **Lifecycle History**: 물건을 단순 삭제하지 않고 사용·판매·기부·재활용·폐기 등의 결과를 기록합니다.
3. **AI as Assistant**: AI는 서비스의 목적이 아니라 영수증 자동입력과 데이터 기반 판단으로 사용자의 행동 수를 줄이는 보조 기능입니다.
4. **API is Optional Automation**: 반복 가치가 검증된 외부 서비스만 향후 API/Webhook Connector로 확장합니다.

## 사용자 흐름

```text
URL 연결 등록
        ↓
물건 등록
  ├─ 직접 입력
  ├─ 카메라/사진
  └─ 영수증 AI 분석
        ↓
보유 물품 관리
  ├─ 수량
  ├─ 위치
  ├─ 유효일
  └─ 메모
        ↓
처리 방식 선택
  ├─ 사용 완료
  ├─ 판매
  ├─ 기부/나눔
  ├─ 재활용
  ├─ 수리/이관
  └─ 폐기
        ↓
사용자 URL 연결
        ↓
Lifecycle 이력 저장
        ↓
AI가 보유 데이터 + 처리 이력 기반 판단 보조
```

## Demo Flow

1. `URL 연결 관리`에서 사용자가 실제 쓰는 판매/기부/재활용/폐기 사이트 등록
2. `신규 등록`에서 직접 입력 또는 영수증 AI 분석으로 물품 등록
3. `대시보드`에서 임박/처리 필요 물품 확인
4. `처리 기록`을 눌러 생애주기 화면으로 이동
5. 판매·기부·재활용·폐기 등 행동과 수량, URL, 메모 저장
6. 처리 기록이 누적되는 것을 확인
7. `AI 보조`에서 현재 보유 물품과 최근 처리 이력을 기반으로 질문

상세 발표 시나리오는 [`docs/DEMO_FLOW.md`](docs/DEMO_FLOW.md)를 참고합니다.

## Architecture

```text
Browser
  ↓
Nginx / React
  ↓
Spring Boot API
  ├─ Auth / JWT / Google OAuth
  ├─ Inventory
  ├─ URL Connectors
  ├─ Lifecycle History
  ├─ AI Gateway
  └─ MariaDB
        ↓
FastAPI AI Service
        ↓
Gemini
```

영수증 이미지는 브라우저가 FastAPI를 직접 호출하지 않고 `React → Spring Boot → FastAPI → Gemini` 경로를 사용합니다. 따라서 Docker/미니PC 배포에서도 브라우저의 `localhost:8000` 직접 연결에 의존하지 않습니다.

## Local development

```bash
cp .env.example .env
docker compose up -d --build
```

기본 로컬 웹 주소는 `http://127.0.0.1:18081`입니다. DB/AI는 Docker 내부 네트워크에 두고 프론트엔드만 loopback 포트로 노출합니다.

## Mini PC production deployment

실제 미니PC 운영은 이 저장소가 직접 80/443을 점유하거나 MOVE-AI 같은 다른 프로젝트의 프록시에 의존하지 않습니다.

```text
Restok-Rangchain
  = 앱 코드 + Dockerfile + 앱 CI

chl4890620123-collab/Server
  = Windows self-hosted runner
  = Restok 운영 Compose
  = Caddy
  = DB/업로드 영속 데이터
  = 배포 전 DB 백업
  = 공개 HTTPS 검수 URL
```

Server 저장소의 Restok 배포는 호스트 `127.0.0.1:9050`만 사용하므로 기존 80/443 서비스와 충돌하지 않습니다. 공개 검수는 별도의 HTTPS tunnel을 사용합니다.

운영 데이터는 앱 소스와 분리합니다.

```text
D:\server-data\restok\runtime\.env
D:\server-data\restok\mariadb
D:\server-data\restok\uploads
D:\server-data\restok\backups
```

## Database charset migration

MariaDB 기본 charset은 Compose에서 `utf8mb4`로 설정합니다. 기존 테이블을 `ALTER TABLE ... CONVERT`하는 작업은 앱 시작 시 자동 수행하지 않습니다.

```dotenv
DB_CHARSET_MIGRATION_ENABLED=false
DB_CHARSET_MIGRATION_LOCK_WAIT_SECONDS=10
```

유지보수 시간에 명시적으로 활성화한 경우에만 실행됩니다. 대상 DB/테이블을 먼저 확인하고, `FOREIGN_KEY_CHECKS` 변경과 ALTER는 동일 DB connection에서 수행하며 lock wait를 제한합니다.

## Security / configuration notes

- 실제 비밀번호/API Key는 Git에 커밋하지 않습니다.
- DB 연결정보, 업로드 경로, CORS, AI 서비스 주소는 환경변수로 분리합니다.
- Lifecycle API는 로그인 사용자 소유 물품만 처리할 수 있습니다.
- URL Connector는 사용자가 선택한 외부 목적지이며, API와 동일한 기능으로 취급하지 않습니다.
- Gemini 키가 없어도 로그인, URL 연결, 물품, Lifecycle 기능은 동작하고 AI 기능만 제한됩니다.

## Next roadmap

- 처리 이력 기반 반복 폐기율/소비 패턴 시각화
- 품목별 권장 구매량 추정
- 공공 재활용/폐기 정보 RAG
- 자주 사용하는 Connector에 선택적 API/Webhook 자동화
- 처리 결과(판매금액, 기부량, 폐기량)의 KPI 대시보드
