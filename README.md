# 병역명문가 혜택 지도

브라우저에서 병무청 공식 예우시설을 지역·업종·혜택 종류로 검색하는 별도 지도입니다. 기존 QGIS 플러그인과 독립적으로 실행합니다.

## 실행

`node scripts/serve.cjs` 실행 후 http://127.0.0.1:8093 에 접속합니다.

Windows에서는 `start-map.cmd`를 실행하면 http://localhost:8093 브라우저와 서버를 함께 엽니다. 서버 창을 닫으면 접속이 종료됩니다. 사용한 접속 주소의 도메인을 그대로 등록해야 합니다. 포트 변경은 `BENEFIT_MAP_PORT` 환경 변수로 지정할 수 있습니다.

카카오 개발자 콘솔에서 카카오맵 API 사용을 활성화하고 JavaScript 키의 SDK 도메인에 실제 접속 주소를 등록하세요. 로컬 주소와 배포 주소는 각각 등록해야 합니다. GitHub Actions가 저장소 Secret `KAKAO_JAVASCRIPT_KEY`로 `dist/config.js`를 생성하여 지도가 자동 연결됩니다. 생성된 파일은 Git에서 제외합니다. 방문자에게 키 입력을 요청하지 않습니다. REST API 키는 사용하지 않습니다.

이번 지도에 사용할 주소:

- 로컬: `http://localhost:8093` (또는 직접 사용하는 `http://127.0.0.1:8093`)
- 배포 주소: https://benefits.yjkim.dev

운영 주소와 로컬 테스트 주소는 각각 해당 키의 JavaScript SDK 도메인에 등록해야 합니다. 지도 하단의 최종 업데이트 날짜는 배포 날짜가 아닌 현재 시설 데이터의 수집 날짜를 한국 시간으로 표시합니다.

## 데이터

출처: https://www.mma.go.kr/hall/listpart.do?mc=mma0003392

공식 페이지가 사용하는 공개 JSONP 조회 서비스에서 2026-10-16 수집한 전국 시설 스냅샷을 사용합니다. 혜택 설명을 임의로 요약하거나 할인율을 생성하지 않습니다. 좌표가 대한민국 범위 밖이거나 없는 시설은 지도에서 제외하고 목록에는 유지합니다. 주소·좌표·혜택의 정확성과 실제 적용 여부는 원문 및 시설을 통해 확인해야 합니다. 전국 공통 기관의 좌표는 모든 지점을 뜻하지 않습니다.

갱신하려면 아래 공개 주소의 응답을 파일로 저장하고 `node scripts/prepare-data.cjs <파일 경로>`를 실행합니다. 실패한 응답이나 중복 ID가 있으면 기존 데이터 파일을 덮어쓰지 않습니다.

https://open.mma.go.kr/caisGGGS/bymmgPartAjaxJsonCall.json?udjiyeok_cd=&udggeopjong_gbcd=&callback=mmaCallback

## 기능

- 전국 목록 검색, 22개 업종, 지역, 면제·할인·기타 필터
- 카카오 지도 마커 군집화, 지도 영역 검색, 결과 전체 보기
- 시설 상세 혜택·연락처·원문·카카오 길찾기
- 길찾기: 위치 확인 없이 목적지를 지정한 카카오·네이버 길찾기를 새 탭에서 바로 엽니다. 출발지는 지도 서비스에서 선택합니다.
- 위치 권한을 허용한 경우 직선거리 기준 가까운 순 정렬
- 작은 화면에서도 지도와 목록 이용 가능
- 내 위치 기준 정렬은 사용자가 해당 버튼을 눌렀을 때만 위치를 확인합니다. 길찾기 링크에는 현재 위치를 포함하지 않습니다. 지도 SDK의 통상 네트워크 통신은 발생합니다.

## GitHub 및 정적 호스팅

저장소: https://github.com/youngj-kim/military-family-benefit-map

빌드 과정이 없는 HTML/CSS/JavaScript 웹사이트입니다. 정적 호스팅 서비스에서 GitHub 저장소의 `main` 브랜치를 연결하고, 프레임워크 없음 및 배포 디렉터리 `dist`를 선택합니다. 빌드 명령은 비워 둡니다. 이 저장소 업로드만으로 웹사이트가 자동 게시되지는 않습니다.

`dist/config.js`는 저장소에 포함하지 않습니다. 배포 워크플로가 Actions Secret `KAKAO_JAVASCRIPT_KEY`를 환경 변수로 전달하여 `node scripts/create-config.cjs`로 생성합니다. 값이 없거나 형식이 잘못되면 배포를 실패 처리하며 키 값은 로그로 출력하지 않습니다. 배포 산출물에는 브라우저에서 사용하는 JavaScript 키가 포함됩니다. 해당 키의 허용 SDK 도메인을 실제 배포 주소로 제한해야 합니다. 방문자가 별도로 키를 입력하지 않아도 자동으로 지도를 불러옵니다. REST API 키, Admin 키, 개인 인증 토큰은 저장소에 넣지 않습니다.

## 라이선스

직접 작성한 웹사이트 코드는 MIT License를 따릅니다. 병무청에서 제공한 시설 데이터와 카카오 지도 SDK에는 이 저장소의 MIT 라이선스를 적용하지 않으며 각 제공처의 이용 조건을 따릅니다. 데이터 출처와 수집 시점은 위 데이터 항목에 표기했습니다.

## 로컬 키 설정과 기존 키

로컬에서는 `config.example.js`를 `dist/config.js`로 복사한 뒤 JavaScript 키를 입력합니다. 이 파일은 `.gitignore`로 제외됩니다. 또는 `KAKAO_JAVASCRIPT_KEY` 환경 변수를 설정하고 `node scripts/create-config.cjs`를 실행합니다. GitHub Secret의 값은 로컬에서 읽을 수 없습니다.

이전에 커밋한 키는 현재 소스에서 제거했지만 과거 Git 커밋에는 남아 있습니다. 새 키를 사용한 배포가 정상 동작하는지 확인한 뒤, 기존 키는 다른 QGIS/사이트에서 사용하는지 확인하고 불필요한 도메인을 제거하거나 키를 폐기하세요. 기존 키가 다른 서비스와 공유된다면 임의로 폐기하면 해당 서비스가 중단될 수 있습니다.
## 월간 병무청 변경 확인 및 Telegram 알림

GitHub Actions의 **Check MMA facility updates**가 매월 1일 오전 9시(한국 시간)에 병무청 공식 예우시설 데이터를 확인합니다. GitHub 예약 실행은 혼잡 시 지연될 수 있고, 공개 저장소에 장기간 활동이 없으면 예약 실행이 비활성화될 수 있으므로 Actions 화면에서 상태를 확인하세요. 수동 실행은 언제든 가능합니다.

### Telegram 연결

이 저장소의 **Settings → Secrets and variables → Actions → Repository secrets**에 다음을 등록합니다.

- `TELEGRAM_BOT_TOKEN`: BotFather에서 발급한 봇 토큰. 카카오 키와 달리 실제 비밀 자격증명이므로 파일·채팅·커밋에 넣지 않습니다.
- `TELEGRAM_CHAT_ID`: 알림을 받을 개인 대화/그룹의 chat ID. 개인 대화는 먼저 해당 봇에 `/start`를 보내야 하며, 그룹은 봇을 추가하고 메시지 발송 권한을 허용해야 합니다.

chat ID는 본인 환경에서 Telegram 공식 `getUpdates` 응답의 `message.chat.id`로 확인할 수 있습니다. 토큰을 제3자 조회 사이트에 입력하지 마세요. 공식 API 문서: https://core.telegram.org/bots/api#getupdates

등록 후 **Actions → Check MMA facility updates → Run workflow**에서 `test_telegram`을 체크하면 연결 확인 메시지만 보냅니다. 체크하지 않으면 실제 원본 비교를 수행하며, 변경이 없을 때는 Telegram을 보내지 않습니다. Secrets가 없는 상태에서는 실제 알림 전송을 검증할 수 없습니다.

### 변경 검토와 반영

1. 시설 ID로 추가·삭제·내용 변경을 비교합니다. 행 순서·조회 시각·사용하지 않는 원본 메타데이터 변화는 알리지 않습니다.
2. 변경이 있으면 `mma-facility-update` 브랜치에 새 `dist/facilities.json`과 `updates/mma-changes.md`를 저장하고 초안 PR을 생성합니다. 후보를 만들 때 현재 공개 지도는 수정하지 않습니다.
3. Telegram에 변경 건수와 검토 링크를 보냅니다. 같은 후보의 알림이 성공한 경우 중복 알림을 보내지 않습니다. 발송이 실패했거나 Secrets가 나중에 설정된 경우 수동 실행으로 재시도할 수 있습니다.
4. PR의 변경 보고서를 확인하고 검토 완료 후 `main`에 병합하면 기존 Pages 워크플로가 새 데이터로 배포합니다. 지도 하단의 날짜도 새 수집 날짜로 바뀝니다.

자동 PR 생성은 **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests** 설정이 필요할 수 있습니다. 허용되지 않아도 후보 브랜치·보고서·Telegram 비교 링크는 남기므로 링크에서 직접 PR을 만들 수 있습니다. 자동 승인·자동 병합은 하지 않습니다.

Actions 실행의 `mma-facility-review` 아티팩트에도 요약·변경 보고서·후보 JSON을 90일간 보관합니다. 원본 조회 오류, 빈 데이터, 중복 ID, 25% 초과 급감은 실패 처리하며 기존 배포 데이터는 유지합니다. Telegram이 연결되어 있으면 원본 확인 실패도 알립니다.

개발 검증: `node --test tests/mma-data.test.cjs`

읽기 전용 확인: `node scripts/monitor-mma.cjs` (보고서는 Git에서 제외된 `.monitor-output`에 저장하며 Telegram·GitHub 변경은 하지 않습니다.)
## 네이버 길찾기

카카오·네이버 길찾기 버튼은 목적지 이름과 WGS84 좌표만 지정해 새 탭으로 즉시 연결합니다. 이 과정에서 위치 권한을 요청하지 않습니다. 네이버 API 키는 필요하지 않으며 경로 계산과 출발지 선택은 각 지도 서비스에서 처리합니다. 좌표가 없어도 주소가 있으면 원문 주소 검색을 엽니다. 좌표와 주소가 모두 없는 경우만 버튼을 비활성화합니다.
## 국방부 공식 영외마트 목록과 좌표

- 별도 파일: `dist/marts.json` (초기 120곳)
- 국방부 원문: https://opendata.mnd.go.kr/openinf/sheetview2.jsp?infId=OA-9645
- 공공데이터포털: https://www.data.go.kr/data/15126305/fileData.do
- 자료 기준일: 2026-04-28. 국방부가 공시한 갱신 주기는 연간입니다. 월간 모니터는 새 공식 자료의 등록 여부를 확인하며 실시간 영업 여부를 보장하지 않습니다.
- 원문 페이지의 공공누리 제3유형 표기를 따르며, 제공된 필드는 `original`에 보존합니다. 운영시간·점심시간·비고를 수정하거나 휴무 여부를 추측하지 않습니다. 빈 값은 원문 미기재로 표시합니다.

화면의 시설 종류에서 예우시설·영외마트·전체를 선택합니다. 영외마트는 할인·면제와 구분하며, 상세에서 운영정보·휴점/분리운영 유의사항·공식 출처·이용 안내를 확인할 수 있습니다. 주요 버튼은 카카오·네이버 길찾기 두 개만 표시합니다.

### REST API로 별도 좌표 보강

GitHub 저장소 Secret `KAKAO_REST_API_KEY`는 **Collect official mart coordinates** 워크플로에서만 서버 측 인증 헤더로 사용하고, 월간 모니터의 신규·주소 변경 시설 좌표 조회에도 사용합니다. 키는 소스·수집 결과·정적 배포 파일·로그에 포함하지 않습니다.

주소 검색으로 얻은 결과는 공식 `lat`/`lng`나 원문 주소를 덮어쓰지 않고 아래 별도 필드에 저장합니다.

- `geocodedLat`, `geocodedLng`: 주소 기반 WGS84 좌표
- `geocodeAddress`: 실제 조회한 원문 주소
- `geocodedAt`: 조회 시각
- `geocodeProvider`: `kakao-address`
- `geocodeStatus`: `located` 또는 `not_found`

공식 주소와 시설 ID가 같으면 기존 결과를 재사용하여 호출량을 줄입니다. 위치 조회 결과는 공식 제공 좌표가 아니므로 현장 입구·이전 여부를 확인해야 합니다. 결과가 없으면 임의 좌표를 생성하지 않습니다. 브라우저는 저장된 좌표로 지도를 표시하므로 방문할 때마다 120건을 재조회하지 않습니다.

초기 수집은 워크플로 추가 시 자동 실행하며, 완료된 좌표 파일을 `main`에 커밋한 뒤 Pages 재배포를 요청합니다. 수동 실행은 Actions → Collect official mart coordinates → Run workflow입니다. 이 작업은 현재 공식 목록의 좌표만 보강합니다. 공식 목록 자체의 변경은 월간 모니터의 검토 PR을 통해 반영합니다.

기존 **Check MMA facility updates**는 같은 월간 일정으로 병무청 예우시설과 국방부 영외마트를 모두 비교합니다. Telegram과 보고서는 어느 출처에서 추가·삭제·주소·혜택·운영시간·휴점 안내가 바뀌었는지 구분합니다. 매월 1일 오전 9시(한국 시간)에 확인하고 변경이 없으면 발송하지 않습니다. 원본 오류나 25% 초과 급감 시 기존 배포를 유지합니다.