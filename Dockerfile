FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY index.html ./
COPY styles.css ./
COPY app.js ./
COPY server.js ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173

EXPOSE 4173

CMD ["node", "server.js"]
