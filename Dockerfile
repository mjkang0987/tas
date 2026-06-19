# Cloud Run 배포용 Next.js standalone 이미지.
#
# 빌드 컨텍스트 = repo 루트 (client/ 와 server/ 를 모두 필요로 함).
#   docker build -t tas .              (루트에서)
#   gcloud run deploy --source .       (루트에서, Cloud Build 경유)
#
# 구조 메모:
# - 루트와 client/ 는 각각 독립 pnpm 프로젝트(별도 lockfile). 둘 다 install 필요.
#   루트: server/ 백엔드 소스 + prisma 툴링 의존성. client/: Next 앱.
# - prisma generated 클라이언트는 client/prisma/generated (schema 는 server/prisma).
# - next.config 의 output:'standalone' + outputFileTracingRoot=repo 루트로
#   server/ 와 prisma 런타임(@prisma/client, pg adapter)이 산출물에 포함됨.

ARG NODE_VERSION=24
ARG PNPM_VERSION=11.7.0

# ---------- deps: 의존성 설치 (레이어 캐시 최적화) ----------
FROM node:${NODE_VERSION}-slim AS deps
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# 매니페스트만 먼저 복사해 install 레이어 캐시
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# client/pnpm-workspace.yaml 도 함께 복사해야 client 가 자기 자신을 워크스페이스
# 루트로 인식. 없으면 pnpm 이 위로 올라가 /repo 워크스페이스를 root 로 잡고
# client install 이 "Already up to date" 로 스킵돼 client/node_modules 가 안 생김.
COPY client/package.json client/pnpm-lock.yaml client/pnpm-workspace.yaml ./client/

# 루트(server + prisma 툴링) 의존성.
# 주: BuildKit 캐시 마운트(--mount=type=cache)는 Cloud Build 기본 docker 빌더가
#     BuildKit 비활성이라 못 씀. 빌드 속도 최적화일 뿐이라 제거해 호환성 확보.
RUN pnpm install --frozen-lockfile
# client(Next 앱) 의존성. postinstall(prisma generate)은 소스가 아직 없으니 스킵.
RUN cd client && pnpm install --frozen-lockfile --ignore-scripts

# ---------- builder: prisma generate + next build ----------
FROM node:${NODE_VERSION}-slim AS builder
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/client/node_modules ./client/node_modules
COPY . .

# 빌드 산출물 추적/시크릿 노출 방지: 빌드 시 NODE_ENV=production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# `pnpm build` = prisma generate(client/prisma/generated) + next build(standalone)
RUN cd client && pnpm build

# ---------- runner: 최소 런타임 이미지 ----------
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run 은 PORT 를 주입(기본 8080). standalone server.js 가 PORT/HOSTNAME 을 따름.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# standalone 산출물(server.js + 추적된 node_modules + 번들된 server/·prisma).
# tracingRoot 가 repo 루트라 server.js 는 /app/client/server.js 에 위치.
COPY --from=builder --chown=node:node /repo/client/.next/standalone ./
# standalone 에 자동 포함되지 않는 정적 자산은 수동 복사.
COPY --from=builder --chown=node:node /repo/client/.next/static ./client/.next/static
COPY --from=builder --chown=node:node /repo/client/public ./client/public

USER node
EXPOSE 8080
CMD ["node", "client/server.js"]
