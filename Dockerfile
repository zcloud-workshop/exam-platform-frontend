FROM node:24.13.0-bookworm-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
RUN VITE_API_BASE_URL=/api pnpm build

FROM nginx:1.30.5-alpine AS production

ENV BACKEND_UPSTREAM=app:3000 \
    NGINX_ENVSUBST_FILTER=^BACKEND_UPSTREAM$

COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
