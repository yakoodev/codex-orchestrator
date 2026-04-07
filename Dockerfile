FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm install -g @openai/codex

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run start"]
