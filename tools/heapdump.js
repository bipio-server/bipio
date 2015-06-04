#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@bip.io>
 * Copyright (c) 2010-2014 Michael Pearson https://github.com/mjpearson
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * A Bipio Commercial OEM License may be obtained via hello@bip.io
 */
/**
 * Sends a heapdump packet to target pid via bastion
 */

process.HEADLESS = true;
if (!process.argv[2]) {
  console.log('Usage - heapdump {pid}');
  process.exit(0);
}

var pid = process.argv[2]
  bootstrap = require(__dirname + '/../src/bootstrap'),

bootstrap.app.bastion.on('readyQueue', function(readyQueue) {
  if (readyQueue == 'queue_jobs') {
    bootstrap.app.bastion.createJob(
      DEFS.JOB_HEAP_DUMP,
      {
        pid : Number(pid),
        key : CFG.dumpKey
      }
    );

    //queues don't receipt delivery so wait arbitrarily and close out
    setTimeout(function() {
      process.exit(0);
    }, 1000)
  }
});