# base node image
FROM node:16-bullseye-slim as base

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl curl

# Install all node_modules, including dev dependencies
FROM base as deps

RUN mkdir /app
WORKDIR /app

ADD package.json yarn.lock ./
RUN yarn install

# Setup production node_modules
FROM base as production-deps

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD yarn.lock yarn.lock ./
RUN yarn install --production

# Build the app
FROM base as build

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

ADD . .
RUN yarn build

# Finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules

COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
ADD . .

CMD ["yarn", "start"]
