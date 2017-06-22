#!/bin/bash
cd $(dirname "$0")/..
echo \
  $(find public/js -name  '*.js' -print0 | \
      xargs -0 -I file echo file | \
      sed -e 's/].js$//' | \
      xargs)
