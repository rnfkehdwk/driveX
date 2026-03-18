FROM node:20-alpine

WORKDIR /app

# 패키지 설치 (캐시 레이어)
COPY package*.json ./
RUN npm ci --production

# 소스 복사
COPY . .

# 헬스체크용
RUN apk add --no-cache curl

EXPOSE 3001

CMD ["node", "index.js"]
