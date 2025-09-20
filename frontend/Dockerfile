# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

COPY . .

# COPY frontend/package*.json ./
RUN npm install

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
