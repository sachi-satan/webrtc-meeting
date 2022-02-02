FROM node:11.1

COPY . /src
WORKDIR /src

CMD npm install && npm run build && npm run start

ENV HOST 0.0.0.0
EXPOSE 3000
