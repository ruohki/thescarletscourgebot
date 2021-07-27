FROM node:lts-alpine3.14 as builder
WORKDIR /
COPY . /
RUN npm install
RUN npm run build


FROM node:lts-alpine3.14
WORKDIR /
COPY --from=builder /dist/main.js /
COPY --from=builder /package.json /
RUN npm install --production
CMD ["npm","start"]