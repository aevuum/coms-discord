FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install --no-audit --progress=false

COPY . .

RUN npx prisma generate

CMD ["npm", "run", "dev"]