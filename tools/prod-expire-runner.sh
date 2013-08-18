#!/bin/bash
export NODE_ENV=production
export HOME="/var/local/www/cloudspark/prod/server"
cd $HOME 
(date &&
/var/local/www/cloudspark/node ./tools/bip-expire.js ) 2>&1 >> /var/local/www/cloudspark/prod/server/logs/cron_server.log