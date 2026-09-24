FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY shared ./shared
COPY server ./server
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
