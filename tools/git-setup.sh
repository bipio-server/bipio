#!/bin/bash

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../" && pwd )"
GITDIR=$BASEDIR/.git

if [ -a $GITDIR ]; then
  mkdir -p $GITDIR/hooks

  # add post-merge
  cp $BASEDIR/tools/post-merge $GITDIR/hooks
  chmod ug+x $GITDIR/hooks/post-merge
fi