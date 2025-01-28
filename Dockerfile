# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.20.6
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="staging"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Set the working directory to /app
WORKDIR /app

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Install root dependencies
RUN npm install

# Build the contracts in the root directory
COPY packages ./packages
COPY scripts ./scripts
RUN npm run build:all-contracts

# Copy the server directory
COPY server ./server
# Move the packages directory to the server
RUN mv ./packages ./server/packages

# Set the working directory to /app/server
WORKDIR /app/server

# Install server dependencies
RUN npm install

# Build the server application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev

# Final stage for app image
FROM base

# Set the working directory to /app/server
WORKDIR /app/server

# Copy the built server application from the build stage
COPY --from=build /app/server .

# Expose the port the app runs on
EXPOSE 3000
CMD [ "npm", "run", "coldstart" ]
