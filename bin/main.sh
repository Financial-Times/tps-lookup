#/bin/bash

task_clean() {
  rm -rf dist
}

task_bundleJS() {
  echo "browserifying..."
  ./bin/build_js.sh
}

task_compileCSS() {
  echo "compiling CSS from SCSS..."
  ./bin/build_css.sh
}

task_compileAll() {
  task_clean
  task_bundleJS
  task_compileCSS
}

main() {
  cd $(dirname "$0")/..
  PATH="${PATH}:${PWD}/bin"
  PATH="${PATH}:${PWD}/node_modules/.bin"
  PATH="${PATH}:/usr/bin:/bin"

  export PATH
  task_name="$1"
  if type "task_${task_name}" &>/dev/null; then
    shift
    eval "task_${task_name}" "$@"
  fi
}

main "$@"
