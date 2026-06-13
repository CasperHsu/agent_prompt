# 視界學院 LINE 客服 Bot — 容器映像
FROM node:20-alpine

WORKDIR /app

# 先裝相依，善用快取（只在 lock 變動時重裝）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 複製原始碼
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 健康檢查（對應 server.js 的 /healthz）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
