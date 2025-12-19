# Stage 1: Build
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]