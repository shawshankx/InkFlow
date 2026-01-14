# === 阶段 1: 前端构建 ===
FROM node:20-alpine AS ui-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install --registry=https://registry.npmmirror.com
COPY frontend/ .
RUN npm run build

# === 阶段 2: 后端构建 ===
FROM golang:1.24-alpine AS backend-builder
ENV GOPROXY=https://goproxy.cn,direct
WORKDIR /app/backend
COPY backend/ .
# 下载依赖并生成 go.sum
RUN go mod tidy
# 嵌入前端静态资源
COPY --from=ui-builder /app/frontend/dist ./static
# 编译
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o inkflow-server .

# === 阶段 3: 运行环境 ===
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY --from=backend-builder /app/backend/inkflow-server .
EXPOSE 8080
CMD ["./inkflow-server"]