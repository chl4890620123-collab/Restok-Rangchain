# 1. Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 빌드 시점에 환경 변수 주입 (중요)
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# 2. Run stage (Nginx)
FROM nginx:stable-alpine
# React 빌드 결과물을 nginx 폴더로 복사
COPY --from=build /app/build /usr/share/nginx/html
# 필요시 커스텀 nginx 설정 복사 (Scanner 라우팅 대응)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]