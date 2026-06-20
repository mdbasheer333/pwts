# 1. Use the official pre-built Playwright image from Microsoft
# This already contains Ubuntu, Node.js, npm, sudo, and ALL browsers/fonts pre-installed!
FROM ://microsoft.com

# 2. Set the application directory inside the container
WORKDIR /app

# 3. Copy your project configuration rules
COPY package*.json ./

# 4. Install your project dependencies using your proxy-friendly installer
RUN npm i

# 5. Copy the rest of your local testing files (like tests/ and playwright.config.ts)
COPY . .

# 6. Default execution trigger to run your tests in headless mode
CMD ["npx", "playwright", "test"]
