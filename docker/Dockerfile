FROM node:alpine
MAINTAINER "bbpink" <ssbbpink@gmail.com>
RUN mkdir /opt && cd /opt && apk --update --no-cache add git python make gcc g++ && git clone https://github.com/bbpink/node-shpapad.git && cd /opt/node-shpapad && npm install
WORKDIR /opt/node-shpapad
EXPOSE 3000
CMD [ "npm", "start" ]
