FROM node:24-alpine

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json ./

# Copy workspaces
COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib

# Install dependencies
RUN npm install --omit=dev

# Build API server
WORKDIR /app/artifacts/api-server
RUN npm run build

# Expose port
EXPOSE 10000

# Set environment
ENV NODE_ENV=production
ENV PORT=10000

# Start server
CMD ["npm", "start"]
