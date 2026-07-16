FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Expose Vite development port
EXPOSE 5173

# Start Vite with host parameter so it listens to requests from outside the container
CMD ["npm", "run", "dev", "--", "--host"]
