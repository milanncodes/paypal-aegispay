# Minimal development Dockerfile for Next.js 14 (aegispay)
FROM node:20-alpine

# Set container working directory
WORKDIR /app

# Install libc6-compat for Alpine compatibility with Next.js binaries / SWC
RUN apk add --no-cache libc6-compat

# Expose default Next.js local development port
EXPOSE 3000

# Bind to all network interfaces so host can communicate with the container
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run Next.js in development mode with hot reloading
CMD ["npm", "run", "dev"]
