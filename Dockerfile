# Build stage — bcrypt needs native compilation toolchain
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Runtime stage — same base (alpine/musl) so the compiled bcrypt binary matches
FROM node:20-alpine
WORKDIR /usr/src/app
COPY --from=builder /app .
RUN mkdir -p storage && chown -R node:node /usr/src/app
USER node
EXPOSE 7002
CMD ["node", "./bin/www"]
