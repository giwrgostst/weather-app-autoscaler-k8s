# Use official Node.js Alpine image as base for smaller footprint
FROM node:18-alpine

# Install build tools, git, perl and wrk for stress testing
RUN apk add --no-cache \
      build-base \
      linux-headers \
      libuv-dev \
      openssl-dev \
      git \
      perl \
    && git clone https://github.com/wg/wrk.git /wrk \
    && make -C /wrk \
    && cp /wrk/wrk /usr/local/bin/ \
    && rm -rf /wrk

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
