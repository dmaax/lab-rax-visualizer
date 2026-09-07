# ---------------------------------------------------------------- base ------
FROM node:22-alpine AS base
WORKDIR /app

# ---------------------------------------------------------------- deps ------
# Cached separately so a source edit doesn't reinstall node_modules.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- dev -------
# Vite dev server with hot reload. Meant to be used with the bind mount
# defined in docker-compose.yml.
FROM base AS dev
ENV NODE_ENV=development
# Windows/macOS bind mounts do not deliver inotify events into the container,
# so the watcher has to poll (see vite.config.ts).
ENV VITE_USE_POLLING=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------- build -----
FROM deps AS build
COPY . .
RUN npm run build

# ---------------------------------------------------------------- prod ------
# Static build served by nginx - mirrors how the app is actually deployed.
FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
