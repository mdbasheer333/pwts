# 1. Start from your local Ubuntu base image
FROM ubuntu:latest

# 2. Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# 3. Cleanly install Node.js and NPM using Ubuntu's native repository
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 4. Create and jump straight into the application working directory
WORKDIR /app

# 5. Copy package management rules first to utilize Docker build layer caching
COPY package*.json ./

# 6. Install your local Node JavaScript project dependencies
RUN npm i

# 7. CRUCIAL: Tell Playwright to install the native Linux system browsers and system font dependencies
RUN npx playwright install --with-deps

# 8. Copy the rest of your local testing files (filtered through your .dockerignore)
COPY . .

# 9. Default trigger to execute your Playwright test runner inside the container
CMD ["npx", "playwright", "test"]