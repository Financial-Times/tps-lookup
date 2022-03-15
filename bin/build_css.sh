#!/bin/bash
cd $(dirname "$0")/..

mkdir -p dist
sass public/css/main.scss dist/main.css
