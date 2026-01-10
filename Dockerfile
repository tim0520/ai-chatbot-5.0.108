# 1. 使用 Node.js 20 官方轻量镜像作为基础
FROM node:20-alpine AS base

# 2. 设置工作目录
WORKDIR /app

# 3. 安装 pnpm (因为你的项目用的是 pnpm)
RUN npm install -g pnpm

# 4. 单独复制依赖描述文件 (利用 Docker 缓存机制加速构建)
COPY package.json pnpm-lock.yaml* ./

# 5. 安装依赖
RUN pnpm install

# 6. 复制所有源代码
COPY . .

# 7. 构建项目 (生成 .next 文件夹)
RUN pnpm build

# 8. 暴露端口 (虽然我们用了 host/service 网络模式，写上也无妨)
EXPOSE 3000

# 9. 启动命令
CMD ["pnpm", "start"]