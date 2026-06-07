FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5174
ENV DATA_DIR=/app/data

EXPOSE 5174

CMD ["npm", "run", "start"]
