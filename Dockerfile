# syntax=docker/dockerfile:1

# Use an official Node.js runtime as a base image
FROM node:22-alpine

# Set environment variable
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Set the working directory inside the container
WORKDIR /app

# Ensure the node user owns the directory
RUN chown -R node:node /app

# Switch to the non-root node user
USER node

# Copy dependency files and install dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy the rest of the app source code
COPY --chown=node:node . .

# Set the default command to run your ETL script
CMD ["node", "app.js"]
