# Multi-stage lightweight Docker image for GCP deployment
FROM node:20-alpine

WORKDIR /app

# Copy application files
COPY . .

# Expose port (Cloud Run defaults to PORT 8080)
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
