# Stage 1 - Build
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2 - Nginx
FROM nginx:latest

COPY --from=0 /app/dist/ /usr/share/nginx/html

EXPOSE 80
