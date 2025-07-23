FROM oven/bun:1.1.13

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 8080

CMD ["bun", "index.ts"]