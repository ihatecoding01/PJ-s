# Production Dockerfile for FairWork Express.js Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci

# Copy TypeScript source and configurations
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules and built dist
COPY package*.json ./
COPY prisma ./prisma/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create uploads and database directory
RUN mkdir -p uploads data

EXPOSE 4000

CMD ["node", "dist/index.js"]
