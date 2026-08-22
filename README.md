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
향후 소비/처리 판단에 활용
```

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

기존 화면의 AI 호출은 공통 axios 호환 레이어에서 Spring AI Gateway로 전환됩니다. 영수증 이미지는 `React → Spring Boot → FastAPI → Gemini` 경로를 사용하므로 Docker 또는 미니PC 배포에서 브라우저의 `localhost:8000` 직접 연결 문제를 피합니다.

## 주요 기능

- 회원가입 / 로그인 / Google OAuth / JWT
- 사용자별 카테고리와 보관 위치
- 사진/카메라 기반 물품 등록
- 영수증 이미지 AI 분석 및 다중 품목 등록
- QR 코드 기반 검색
- 사용자 지정 외부 URL Connector
- 판매·기부·재활용·폐기 등 Lifecycle 처리 이력
- 현재 보유 데이터 + 최근 처리 이력을 활용한 AI 보조
- Docker Compose 기반 MariaDB / Backend / AI / Frontend 구성

## Local / Mini PC deployment

1. 환경 파일 생성

```bash
cp .env.example .env
```

2. `.env`에 DB 비밀번호와 필요한 API/OAuth 키를 입력합니다.

3. 전체 서비스 실행

```bash
docker compose up -d --build
```

4. 기본 웹 포트는 `80`입니다. 미니PC에서는 공유기 포트포워딩과 도메인/HTTPS Reverse Proxy 설정에 맞게 `WEB_PORT`와 `APP_CORS_ALLOWED_ORIGINS`를 변경합니다.

## Security / configuration notes

- 실제 비밀번호/API Key는 Git에 커밋하지 않습니다.
- DB 연결정보, 업로드 경로, CORS, AI 서비스 주소는 환경변수로 분리합니다.
- Lifecycle API는 로그인 사용자 소유 물품만 처리할 수 있습니다.
- URL Connector는 사용자가 선택한 외부 목적지이며, API와 동일한 기능으로 취급하지 않습니다.

## Next roadmap

- 처리 이력 기반 반복 폐기율/소비 패턴 시각화
- 품목별 권장 구매량 추정
- 공공 재활용/폐기 정보 RAG
- 자주 사용하는 Connector에 선택적 API/Webhook 자동화
- 처리 결과(판매금액, 기부량, 폐기량)의 KPI 대시보드
