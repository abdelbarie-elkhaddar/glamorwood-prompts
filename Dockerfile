# Dockerfile — Artwork Scene Prompts
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --production

# Copy app files
COPY server.js .
COPY public/ ./public/

# Data directory (mounted as volume in Coolify)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
