FROM node:alpine
MAINTAINER "bbpink" <ssbbpink@gmail.com>
RUN mkdir /opt && cd /opt && apk --update --no-cache add git && git clone https://github.com/bbpink/node-shpapad.git && cd /opt/node-shpapad && npm install
EXPOSE 3000
