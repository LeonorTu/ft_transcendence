FROM node:20

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY eslint.config.js ./
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/
COPY tsconfig.app.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./

EXPOSE 5173

CMD ["npm", "run", "dev"]