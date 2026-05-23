# Use official Node base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install packages
RUN npm ci

# Copy application source code
COPY . .

# Disable telemetry and build for production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Expose Next.js default port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
