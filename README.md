# Flem

[![Build Status](https://travis-ci.org/JustinBeckwith/flem.svg?branch=master)](https://travis-ci.org/JustinBeckwith/flem)
[![npm version](https://badge.fury.io/js/flem.svg)](https://badge.fury.io/js/flem)

Flem is a local emulator that makes testing applications written for the App Engine flexible environment easier.  It manages generating docker files, building your containers, and running them in a way that's kinda mostly like running them in production. 

Flem is super ultra expiremental, and under active development.  
**This is a not an official Google project.**

## Installation
Flem requires [Docker](https://www.docker.com/) to be installed and available on the path.  After that ...

`$ npm install -g flem`

## Usage
Flem is a command line tool, and a library.  You can `cd` into any App Engine Flexible application with an `app.yaml`, and just run:

`$ flem`

That's it!  You can also customize the port you run on:

`$ flem -p 3001`

Or run it against a different path:

`$ flem -p 3001 ~/Code/myapp`

## License
[Apache 2.0](LICENSE.md)

## Questions?
Feel free to submit an issue on the repository, or find me at [@JustinBeckwith](http://twitter.com/JustinBeckwith)
