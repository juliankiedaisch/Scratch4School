# Dockerfile
FROM node:20-alpine


# Arbeitsverzeichnis im Container
WORKDIR /app

COPY packages ./packages
COPY scripts ./scripts
COPY package.json .
COPY package-lock.json .

RUN npm install
RUN npm run build

# Wechsle ins scratch-gui-Paket
WORKDIR /app/packages/scratch-gui

# Exponierter Port (npm start verwendet standardmäßig 8601)
EXPOSE 8601

# Start des Scratch-Editors im Entwicklungsmodus
CMD ["npm", "start"]