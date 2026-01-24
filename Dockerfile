# Stage 1: Build
FROM node:20-alpine as build

WORKDIR /app

# Define build arguments for frontend
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

# Set environment variables from build args
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy root package files
COPY package*.json ./

# Copy backend package files (if any needed, good practice)
COPY backend/package*.json ./backend/

# Copy frontend package files explicitly
COPY frontend/package*.json ./frontend/

# Install root dependencies
RUN npm ci

# Install frontend dependencies
RUN cd frontend && npm ci

# Copy all source code
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]