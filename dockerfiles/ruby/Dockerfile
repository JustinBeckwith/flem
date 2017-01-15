FROM gcr.io/google_appengine/ruby
COPY Gemfile Gemfile.lock /app/
RUN bundle install && rbenv rehash
COPY . /app/