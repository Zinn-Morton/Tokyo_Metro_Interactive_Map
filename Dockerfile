# Build the frontend
FROM node:latest as frontend-builder
WORKDIR /client
COPY client/package.json client/package-lock.json ./
COPY client .
RUN npm install
ARG VITE_BACKEND_URL=https://tokyo-metro-interactive-map.fly.dev
RUN npm run build

# Build the backend
FROM node:latest as backend-builder
WORKDIR /server
COPY server/package.json server/package-lock.json ./
COPY server .
RUN npm install

# Final image with frontend and backend
FROM node:latest
WORKDIR /
COPY --from=frontend-builder /client/dist ./client/dist
COPY --from=backend-builder /server ./server

# Expose the port where the Express server will run
EXPOSE 5000

# Start the Express server
WORKDIR /server
CMD ["npm", "start"]