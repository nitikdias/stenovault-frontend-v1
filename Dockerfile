# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies 
COPY package.json package-lock.json* ./
# Use npm ci if package-lock.json exists, otherwise npm install
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 2: Production environment
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["npm", "start"]
