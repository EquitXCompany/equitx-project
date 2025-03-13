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

# Install loam CLI and build contracts
RUN apt-get install -y curl
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
# Install specific toolchain
RUN rustup toolchain install 1.81.0
RUN rustup default 1.81.0
RUN rustup target add wasm32-unknown-unknown
RUN RUSTFLAGS="-C codegen-units=1" cargo install --jobs 1 loam-cli --locked

# Copy everything so we can build contracts
COPY . .
RUN rm ./target/loam/* && mkdir -p ./server/prebuilt_contracts
# Build prebuilt contracts and the rest of the application
RUN npm run build:prebuilt-contracts
RUN LOAM_ENV=staging loam build --build-clients
RUN npm run install:contracts

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

# Install all required runtime dependencies including those needed for stellar-cli
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    curl \
    build-essential \
    ca-certificates \
    pkg-config \
    libdbus-1-dev \
    libssl-dev \
    openssl \
    libudev-dev \
    libssl3 \
    libssl-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Verify cargo is available
RUN echo "Checking cargo version:" && cargo --version

# Install stellar CLI with proper OpenSSL configuration
RUN pkg-config --libs --cflags openssl && \
    RUSTFLAGS="-C codegen-units=1" cargo install --jobs 1 --locked stellar-cli --features opt 

# Set the working directory to /app/server
WORKDIR /app/server

# Copy the built server application from the build stage
COPY --from=build /app/server .

# Copy prebuilt contracts
COPY --from=build /app/server/prebuilt_contracts ./prebuilt_contracts

# Expose the port the app runs on
EXPOSE 3000
CMD [ "npm", "run", "coldstart" ]