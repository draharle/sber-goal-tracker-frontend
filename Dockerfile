# Этап 1: сборка статики (Node). Этап 2: nginx отдаёт статику и проксирует /api.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
# Пусто = браузер ходит в API через nginx того же адреса (/api). Подставляется в сборку.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine
# Куда nginx проксирует /api; переопределяется переменной окружения контейнера.
ENV API_PROXY_TARGET=http://mock-api:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
