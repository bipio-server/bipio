#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@bip.io>
 * Copyright (c) 2015 wot.io inc http://wot.io
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