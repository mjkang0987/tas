# 디자인명세서 — Take a Seat (TAS)

> 최종 수정: 2026-06-06  
> 소스: `client/styles/globalStyle.ts`

---

## 1. 디자인 토큰

### 1.1 타이포그래피

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--big-font` | `18px` | 페이지 제목, 모달 대형 수치 |
| `--font` | `14px` | 기본 본문 |
| `--small-font` | `12px` | 보조 텍스트, 레이블 |
| `--xsmall-font` | `11px` | 메타 정보, 타임스탬프 |
| `--tiny-font` | `10px` | 뱃지, 칩 내부 |

**폰트 패밀리**: SF Pro AR → SF Pro Display → Helvetica Neue → Arial → sans-serif

---

### 1.2 색상

#### 기본 팔레트

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--black-color` | `hsl(0, 0%, 13%)` | 기본 텍스트 |
| `--dark-gray-color` | `hsl(0, 0%, 32%)` | 보조 텍스트, 아이콘 |
| `--dark-gray-color2` | `hsl(0, 0%, 65%)` | 비활성 텍스트 |
| `--gray-color` | `hsl(0, 0%, 86%)` | 구분선, 보더 |
| `--light-gray-color` | `hsl(0, 0%, 89%)` | 입력 보더, 버튼 보더 |
| `--gray-color2` | `hsl(0, 0%, 96%)` | 섹션 배경, hover 배경 |
| `--white-color` | `hsl(0, 0%, 100%)` | 카드 배경, 모달 배경 |
| `--border-color` | `hsl(0, 0%, 80%)` | 일반 보더 |

#### 브랜드 색상

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--blue-color` | `hsl(196, 100%, 45%)` | 주요 액션 버튼, 링크 |
| `--orange-color` | `hsl(27, 100%, 50%)` | 강조, 알림 |

#### 시맨틱 색상

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--danger-color` | `#c93a30` | 에러, 삭제, 취소 텍스트 |
| `--danger-bg` | `#fef2f2` | 에러 배경 (충돌 배너) |
| `--danger-border` | `#fecaca` | 에러 보더 |
| `--warning-color` | `#EA4335` | 경고 텍스트 |
| `--warning-bg` | `#FCE8E6` | 경고 배경 |
| `--warning-border` | `#f5c6c2` | 경고 보더 |
| `--success-color` | `#24753a` | 완료, 성공 텍스트 |
| `--caution-color` | `#a88417` | 주의 텍스트 (노쇼 등) |
| `--cancelled-color` | `hsl(220, 9%, 62%)` | 취소된 항목 텍스트 |

#### 투명도 변형

| 토큰 | 값 |
|------|-----|
| `--black-color-10` | `hsla(0, 0%, 0%, .03)` |
| `--white-color-80` | `hsla(0, 0%, 100%, .8)` |
| `--white-color-60` | `hsla(0, 0%, 100%, .6)` |
| `--white-color-40` | `hsla(0, 0%, 100%, .4)` |

---

### 1.3 간격 (Spacing)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--gap-xs` | `4px` | 아이콘-텍스트 간격 |
| `--gap-sm` | `6px` | 인라인 요소 간격 |
| `--gap-md` | `8px` | 기본 요소 간격 |
| `--gap-lg` | `10px` | 섹션 내 항목 간격 |
| `--list-gap` | `10px` | 목록 아이템 간격 |
| `--card-gap` | `12px` | 카드 내부 간격 |
| `--card-padding` | `8px` | 카드 패딩 |
| `--overlay-padding` | `14px` | 모달/오버레이 패딩 |

---

### 1.4 반경 (Border Radius)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--radius-sm` | `4px` | 작은 버튼, 뱃지 |
| `--radius-md` | `6px` | 기본 버튼, 입력 필드 |
| `--radius-lg` | `8px` | 카드, 드롭다운 |
| `--card-radius` | `8px` | 카드 컨테이너 |
| `--chip-radius` | `999px` | 칩, 태그 (완전 라운드) |
| `--modal-radius` | `10px` | 모달 컨테이너 |
| `--modal-button-radius` | `8px` | 모달 내 버튼 |

---

### 1.5 그림자 (Shadow)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--shadow-sm` | `0 1px 4px rgba(0,0,0,.08)` | 카드, 드롭다운 |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.12)` | 플로팅 패널 |
| `--card-shadow` | `0 8px 18px rgba(15,23,42,.05)` | 카드 기본 |
| `--card-shadow-hover` | `0 14px 26px rgba(15,23,42,.08)` | 카드 hover |
| `--modal-shadow` | `0 24px 60px rgba(15,23,42,.18), 0 6px 18px rgba(15,23,42,.08)` | 모달 |

---

### 1.6 레이아웃 상수

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bar-top` | `56px` | 헤더 높이 |
| `--aside-width` | `200px` | 사이드바 너비 |
| `--timeline-col` | `80px` (모바일: `56px`) | 타임라인 시간 열 너비 |

---

## 2. 사이드바 (Aside)

다크 테마 사이드바.

| 토큰 | 값 |
|------|-----|
| `--aside-bg` | `#1c1c1e` |
| `--aside-text` | `#f5f5f7` |
| `--aside-hover` | `rgba(255, 255, 255, 0.08)` |
| `--aside-divider` | `rgba(255, 255, 255, 0.12)` |

---

## 3. 모달 시스템

### 3.1 모달 구조

```
[모달 헤더]  padding: var(--modal-header-padding) = 4px 8px
             border-bottom: var(--modal-header-border)
[모달 바디]  padding: var(--modal-body-padding) = 8px 6px 30px
[모달 푸터]  padding: var(--modal-footer-padding) = 10px 14px 14px
             border-top: var(--modal-footer-border)
```

### 3.2 모달 버튼

| 속성 | 값 |
|------|-----|
| height | `var(--modal-button-height)` = `32px` (모바일: `30px`) |
| padding-x | `var(--modal-button-padding-x)` = `12px` (모바일: `10px`) |
| border-radius | `var(--modal-button-radius)` = `8px` (모바일: `7px`) |
| font-size | `var(--modal-button-font)` = `13px` |

### 3.3 모달 텍스트

| 토큰 | 값 |
|------|-----|
| `--modal-title-font` | `16px` |
| `--modal-subtitle-font` | `12px` |
| `--modal-message-font` | `14px` |
| `--modal-border` | `rgba(148, 163, 184, 0.22)` |

---

## 4. 인포 그리드 (Info Grid)

정보 표시용 격자 레이아웃 (예약 상세, 고객 상세 등).

| 토큰 | 값 |
|------|-----|
| `--info-grid-gap` | `8px` |
| `--info-grid-cell-gap` | `8px` |
| `--info-grid-cell-padding` | `8px 10px` |
| `--info-grid-cell-radius` | `10px` |

---

## 5. 칩 / 태그

서비스 칩, 고객 태그, 상태 배지에 사용.

| 속성 | 값 |
|------|-----|
| padding | `var(--chip-padding)` = `4px 8px` |
| border-radius | `var(--chip-radius)` = `999px` |
| font-size | `var(--small-font)` = `12px` |

---

## 6. Z-index 계층

| 요소 | 값 | 토큰/설명 |
|------|-----|---------|
| 캘린더 sticky 헤더 | `10` | — |
| 충돌 해결 모달 | `120+` | `--naver-sync-conflict-layer` |
| 고객 상세 레이어 | `140` | `--customer-detail-layer` |
| 예약 상세 레이어 | `150` | `--reservation-detail-layer` |
| 매출 메트릭 모달 | `190` | `--revenue-metric-layer` |
| 전역 오버레이/딤 | `200+` | — |

---

## 7. 예약 상태 색상

캘린더 카드 및 뱃지에 적용.

| 상태 | 배경 | 텍스트 |
|------|------|--------|
| `booked` (예약됨) | `#E8F0FE` | `#4285F4` |
| `completed` (완료) | `#E6F4EA` | `#34A853` |
| `cancelled` (취소) | `#F1F1F1` | `#999` |
| `noshow` (노쇼) | `#FCE8E6` | `#EA4335` |
| `paid` (결제완료) | `#E6F4EA` | `#34A853` |

---

## 8. 서비스 카테고리 기본 색상

서비스 카탈로그에서 카테고리별 기본 색조. 각 서비스는 카테고리 색상의 shade 변형을 사용.

| 카테고리 | 기본 색상 |
|----------|----------|
| 커트 | 청색 계열 |
| 펌 | 보라 계열 |
| 컬러 | 주황/핑크 계열 |
| 크리닉 | 초록 계열 |
| 드라이 | 하늘 계열 |
| 기타 | 회색 계열 |

> 정확한 hex값은 `client/utils/services.ts`의 `CATEGORY_BASE_COLOR_MAP` 참조

---

## 9. 효과

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--sticky-backdrop` | `blur(.8px) saturate(180%)` | sticky 헤더 배경 블러 |
| `--overlay-backdrop-blur` | `.7px` | 모달 뒤 배경 블러 |

---

## 10. 반응형 분기점

현재 정의된 미디어 쿼리 분기점:

| 분기점 | 적용 변경 |
|--------|----------|
| `max-width: 640px` | `--timeline-col: 56px`, 모달 버튼 크기 축소, `--modal-radius: 12px` |

---

## 11. 충돌 배너 (ConflictBanner)

캘린더 헤더 아래 고정 표시 영역.

| 속성 | 값 |
|------|-----|
| height | `34px` |
| background | `var(--danger-bg)` = `#fef2f2` |
| border-bottom | `1px solid var(--danger-border)` = `#fecaca` |
| color | `var(--danger-color)` = `#c93a30` |
| font-size | `12px` |
| flex-shrink | `0` |

---

## 12. 알림 패널 섹션 타이틀 (Sticky)

전체 알림 모달의 3개 섹션 타이틀.

| 속성 | 값 |
|------|-----|
| position | `sticky; top: 0` |
| background | `var(--white-color)` (불투명) |
| z-index | `1` |
| border-bottom | `1px solid var(--gray-color2)` |
| font-size | `var(--small-font)` = `12px` |

> 각 섹션을 패딩 없는 `div`로 감싸서 sticky 스코프를 독립적으로 유지
