# Multi-stage build for AgentCore Runtime

# Stage 1: Build
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY src/agent/package.json ./src/agent/
COPY tsconfig.json ./

# Install dependencies
RUN npm install --workspace=src/agent --production=false

# Copy source code
COPY src/agent ./src/agent

# Build TypeScript
RUN npm run build --workspace=src/agent

# Stage 2: Runtime
FROM public.ecr.aws/docker/library/node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json ./
COPY src/agent/package.json ./src/agent/
RUN npm install --workspace=src/agent --production

# Copy built artifacts from builder
COPY --from=builder /app/src/agent/dist ./src/agent/dist
COPY src/prompts ./src/prompts

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps"

# AgentCore Runtime entry point
# The AgentCore SDK expects an entrypoint that can be invoked
ENTRYPOINT ["node", "src/agent/dist/index.js"]
