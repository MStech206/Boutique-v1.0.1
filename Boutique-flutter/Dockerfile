# Stage 1: Build Flutter web
FROM cirrusci/flutter:stable AS builder

WORKDIR /app

# Cache dependencies
COPY pubspec.* ./
RUN flutter pub get

# Copy source code
COPY . .

# Build release
RUN flutter build web --release --web-renderer canvaskit

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built web files
COPY --from=builder /app/build/web /usr/share/nginx/html

# Copy your custom nginx config (replaces default)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]