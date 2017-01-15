FROM gcr.io/google_appengine/nodejs
COPY . /app/
RUN npm --unsafe-perm install