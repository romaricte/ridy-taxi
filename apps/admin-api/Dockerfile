FROM node:24.1.0-alpine
WORKDIR /app
COPY /apps/admin-api/dist/package*.json ./

# Install production dependencies
RUN npm i && \
    npm i mysql core-js

# Copy built application
COPY /apps/admin-api/dist/main.js ./
COPY /apps/admin-api/dist/migrations ./migrations

EXPOSE 3000
CMD ["node", "main.js"]