#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * Copyright (c) 2017 InterDigital, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 * A Bipio Commercial OEM License may be obtained via hello@bip.io
 */
/*
 * Pauses a bip by id
 */

process.NOCONSUME = true;
process.REQ_PODS = "email";

var bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  bipId = process.argv[2],
  reason = process.argv[3];

if (!bipId) {
	console.log('Usage - ./tools/pause_bip.js {bip_id} "reason" (optional)');
	process.exit();
}

function pauseBip(id, reason, next) {
	dao.find(
		'bip',
		{
			id : id
		},
		function(err, bip) {
			if (err) {
				next(err);

			} else if (bip) {
				var message = reason || 'Paused By Administrator',
					pod = dao.pod('email');

        if (pod && pod.getConfig().sender) {
        	message += ' - Please Contact ' + pod.getConfig().sender + ' for more info';
        }

				dao.pauseBip(bip, true, function(err) {
					if (err) {
						next(err);
					} else {

						var jobPacket = {
		          owner_id : bip.owner_id,
		          bip_id : bip.id,
		          code : 'bip_paused_manual',
		          message : message
		        };

						app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, jobPacket, function() {
							next();
						});
					}
				}
				);

			} else {
				next('Not Found');
			}
		}
	);
}

dao.on('ready', function(dao) {
	pauseBip(bipId, reason, function(err) {
		if (err) {
			console.error(err);
		} else {
			console.log('ok');
		}
		process.exit(0);
	});
});