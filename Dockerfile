# 1. Start from your local Ubuntu base image
FROM ubuntu:latest

# 2. Prevent interactive package installation halts
ENV DEBIAN_FRONTEND=noninteractive

# 3. Cleanly install Node.js, npm, AND the missing 'sudo' system utility
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    nodejs \
    npm \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# 4. Jump straight into the workspace application directory
WORKDIR /app

# 5. Copy package management configurations to preserve layers
COPY package*.json ./

# 6. Install your JavaScript project dependencies
RUN npm i

# 7. 🌟 FIX: Inject the patient environment variable and run the install cleanly
ENV PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=600000
RUN npx playwright install --with-deps

# 8. Copy the rest of your testing codebase
COPY . .

# 9. Default container bootup runtime test runner execution line
CMD ["npx", "playwright", "test"]
