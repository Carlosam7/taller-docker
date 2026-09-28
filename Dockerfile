FROM node:24-slim
WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY tsconfig.json .

RUN npm install -g pnpm && pnpm install

COPY . .
EXPOSE 3000
ENV PORT=3000
CMD ["pnpm", "start"]