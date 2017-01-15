FROM gcr.io/google_appengine/nodejs
ADD package.json /tmp/package.json
RUN cd /tmp && npm install --unsafe-perm || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)
RUN mkdir -p /app && cp -a /tmp/node_modules /app/
WORKDIR /app
COPY . /app/
CMD npm start