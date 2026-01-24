# Stage 1: Build
FROM node:20-alpine as build

WORKDIR /app

# Define build arguments for frontend
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

# Set environment variables from build args
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

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