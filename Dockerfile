FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install --no-audit --progress=false

COPY prisma ./prisma/

RUN npx prisma generate

COPY . .

CMD ["sh", "-c", "npx prisma generate && npm run dev"]