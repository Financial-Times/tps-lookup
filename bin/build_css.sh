#!/bin/bash
cd $(dirname "$0")/..

mkdir -p dist
node-sass public/css/main.scss dist/main.css
