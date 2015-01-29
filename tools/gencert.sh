#!/bin/bash
set -x
#
# Installs a self signed cert for orgname into an install directory
#

CN=$1
INSTALL_DIR=$2

cd $2

openssl genrsa -des3 -passout pass:x -out server.pass.key 2048

openssl rsa -passin pass:x -in server.pass.key -out server.key

rm server.pass.key

openssl req -new -key server.key -out server.csr \
	-subj "/C=US/ST=NY/L=NY/O=WOTIO/OU=BIPIO/CN=$CN"

openssl x509 -req -in server.csr -signkey server.key -out server.crt