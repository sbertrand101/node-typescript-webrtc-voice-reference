FROM node:4

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app
RUN npm install && npm run build && rm -rf ./node_modules && rm -rf ./typings && npm install --production
ENV PORT=3000

CMD [ "npm", "start" ]
EXPOSE 3000