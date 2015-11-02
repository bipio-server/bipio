#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * Copyright (c) 2015 wot.io, inc http://wot.io
 * @author Michael Pearson <michael@bip.io>
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
 * archives active bip_logs table >=2 months old into namespaced table names of bip_logs_YYYYMM
 * and drops from bip_logs.
 *
 * This is a heavy operation, handle with care
 */
process.HEADLESS = true;
process.NOCONSUME = true;

var bootstrap = require(__dirname + '/../src/bootstrap'),
	moment = require('moment'),
  dao = bootstrap.app.dao,
  Q = require('q'),
  _ = require('underscore'),
  monthAge = 2;

dao.on('ready', function(dao) {

	// get max and min
	dao.aggregate(
		'bip_log',
		[
      {
       $group:
        {
          _id: "$item",
          maxCreated: { $max: "$created" },
          minCreated: { $min: "$created" }
        }
      }
   ],
   function(err, result) {
   	if (err) {
   		console.error(err);
   	} else if (result.length) {

//result[0].minCreated = 1431128106615;
//monthAge = 0;

			// create date promises
   		var max = result[0].maxCreated,
   			min = result[0].minCreated,
   			realMax = moment().subtract(monthAge, 'months').endOf('month').valueOf(),
   			realMin = moment(min),
   			year, month,
   			minYear, maxYear
   			promises = {};

   		if (max > realMax) {
   			max = realMax;
   		}

   		minYear = moment(min).get('year');
   		maxYear = moment(max).get('year');

   		minMonth = moment(min).get('month');
   		maxMonth = moment(max).get('month');

   		// shard into months
   		month = ++maxMonth;

			for (var i = maxYear; i >= minYear; i--) {
				for (; month > 0; month--) {

					promises[i * 100 + month] = Q.defer();

					if (i == minYear && month == minMonth) {
						break;
					}

					if (1 == month) {
						month = 12;
						break;
					}
				}
			}

			Q.all(
				_.pluck(
					_.values(
						promises
					),
					'promise'
				)
			).then(
				// accept
				function(results) {
					console.log(results.join());

					process.exit(0);
				},

				// reject
				function() {
					console.error(arguments);
					process.exit(0);
				}
			);

			_.each(promises, function(promise, yearMonth) {
				var ym = moment(yearMonth, 'YYYYMM'),
					from = ym.startOf('month').valueOf(),
					to = ym.endOf('month').valueOf(),
					filter =
						{
						created: {
							$gte : from,
							$lte : to
						}
					};

					console.log('ARCHIVING ' + yearMonth)

					// do not overwrite into collection which already has records
					// ... manually remove records if you need to regenerate the data.
					dao.getConnection().collection('bip_logs_' + yearMonth).count({}, function(err, count) {
						if (err) {
							promise.reject(err);
						} else if (count) {
							promise.resolve('SKIPPING ' + yearMonth);
						} else if (!count) {
							dao.getConnection().collection('bip_logs').aggregate(
								[
									{
										$match: filter
									},
									{
										$out: "bip_logs_" + yearMonth
									}
								],
								function(err) {
									if (err) {
										promise.reject(err);
									} else {
												//promise.resolve('DONE ' + yearMonth );
												//return;
										// cleanup
										dao.removeFilter('bip_log', filter, function(err) {
											if (err) {
												promise.reject(err);
											} else {
												promise.resolve('DONE ' + yearMonth );
											}
										});
									}
								}
							);
						}
					});
			});
   	}
   }
	);
});

