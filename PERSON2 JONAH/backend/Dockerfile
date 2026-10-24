# Production Dockerfile for FairWork Express.js Backend
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copy package specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (using npm install for resilience)
RUN npm install

# Copy TypeScript source and configurations
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript and generate Prisma client
RUN npm run build

# Production runtime stage
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install openssl for Prisma engine runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files, prisma schema, node_modules, and dist
COPY package*.json ./
COPY prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
