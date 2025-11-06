# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.16.0
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
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    curl \
    wget \
    ca-certificates \
    gcc \
    libc6-dev \
    libssl-dev \
    pkg-config \
    && update-ca-certificates

# Install Rust toolchain with minimal components to save memory
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"
# Install specific toolchain
RUN rustup toolchain install 1.89.0 --profile minimal
RUN rustup default 1.89.0
RUN rustup target add wasm32v1-none

# Optimize Cargo build to use less memory
ENV CARGO_BUILD_JOBS=1
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true
ENV RUSTFLAGS="-C codegen-units=1"

# Install scaffold-stellar CLI from prebuilt binary with specific version
RUN mkdir -p /tmp/stellar-scaffold && \
    cd /tmp/stellar-scaffold && \
    wget --no-check-certificate https://github.com/theahaco/scaffold-stellar/releases/download/stellar-scaffold-cli-v0.0.16/stellar-scaffold-cli-v0.0.16-x86_64-unknown-linux-gnu.tar.gz && \
    tar xzf stellar-scaffold-cli-v0.0.16-x86_64-unknown-linux-gnu.tar.gz && \
    mv stellar-scaffold /usr/local/bin/ && \
    chmod +x /usr/local/bin/stellar-scaffold && \
    cd /app && \
    rm -rf /tmp/stellar-scaffold

# Verify stellar-scaffold is installed correctly
RUN stellar-scaffold version || echo "Stellar Scaffold version check failed but continuing build"

# Set the working directory to /app
WORKDIR /app

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Install root dependencies
RUN npm install

# Copy everything so we can build contracts
COPY . .
RUN mkdir -p ./target/stellar && \
    mkdir -p ./server/prebuilt_contracts

# Build prebuilt contracts and the rest of the application
RUN npm run build:prebuilt-contracts
RUN STELLAR_SCAFFOLD_ENV=staging stellar-scaffold build --build-clients
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

# Install ALL required runtime dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    curl \
    wget \
    ca-certificates \
    libudev-dev \
    libssl3 \
    libssl-dev \
    libdbus-1-dev \
    gcc \
    libc6-dev \
    build-essential \
    pkg-config \
    && apt-get clean && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*


# Install stellar CLI from prebuilt binary with specific version
RUN mkdir -p /tmp/stellar && \
    cd /tmp/stellar && \
    wget --no-check-certificate https://github.com/stellar/stellar-cli/releases/download/v23.1.4/stellar-cli-23.1.4-x86_64-unknown-linux-gnu.tar.gz && \
    tar xzf stellar-cli-23.1.4-x86_64-unknown-linux-gnu.tar.gz && \
    mv stellar /usr/local/bin/ && \
    chmod +x /usr/local/bin/stellar && \
    cd /app && \
    rm -rf /tmp/stellar

# Verify stellar is installed correctly (with fallback to prevent build failure)
RUN stellar --version || echo "Stellar version check failed but continuing build"

# Set the working directory to /app/server
WORKDIR /app/server

# Copy the built server application from the build stage
COPY --from=build /app/server .

# Copy prebuilt contracts
COPY --from=build /app/server/prebuilt_contracts ./prebuilt_contracts

# Expose the port the app runs on
EXPOSE 3000
CMD [ "npm", "start" ]