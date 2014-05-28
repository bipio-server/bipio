#!/usr/bin/env bash

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NAME=$1
LABEL=$2

if [ $NAME ]; then

  TARGETDIR="$BASEDIR/../node_modules/bip-pod-$NAME"

  if [ -d $TARGETDIR ]; then
    echo "Target pod directory $TARGETDIR already exists"
    exit 0
  fi

  BOILERDIR="$BASEDIR/../node_modules/bip-pod/boilerplate"
  if [ ! -d $BOILERDIR ]; then
    echo "Source Boilerplate directory $BOILERDIR could not be found"
    exit 0
  fi

  mkdir $TARGETDIR
  cp $BOILERDIR/* $TARGETDIR
  cd $TARGETDIR
  echo 'node_modules' > .gitignore

  TITLE=$NAME

  if [ $LABEL ]; then
    TITLE=$LABEL
  fi

  p1="s/boilerplate/${NAME}/g"
  p2="s/Boilerplate/${TITLE}/g"

  perl -pi -e $p1 *
  perl -pi -e $p2 *

  mv boilerplate.png $NAME.png

  echo 'Done'

else
  echo 'Usage : ./tools/init-boilerplate.sh {pod-name}'
fi

