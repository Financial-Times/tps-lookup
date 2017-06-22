#!/bin/bash

cd $(dirname "$0")/..

mkdir -p dist
echo $(./bin/browserify_args.sh) "$@"
browserify $(./bin/browserify_args.sh) "$@" > dist/bundle.js
