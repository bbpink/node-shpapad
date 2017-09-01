FROM node:slim
MAINTAINER "bbpink" <ssbbpink@gmail.com>
RUN mkdir -p /opt && cd /opt && apt-get update && apt-get -y install git python make gcc g++ && git clone https://github.com/bbpink/node-shpapad.git && cd /opt/node-shpapad && npm install
WORKDIR /opt/node-shpapad
EXPOSE 3000
CMD [ "npm", "start" ]
