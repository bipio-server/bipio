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
  * Creates a testable X-JWT-Signature header for BipIO
  */

var jwt = require('jsonwebtoken'),
	fs = require('fs'),
	path = require('path'),
	configPath,
	config,
	expireMinutes,
	options = {},
  appEnv = process.env.NODE_ENV;

if (appEnv === 'development' || !appEnv) {
  appEnv = 'default';
}

configPath = path.resolve(
  process.env.NODE_CONFIG_DIR || path.join(__dirname, '../config/'),
  appEnv + '.json'
);

config = JSON.parse(fs.readFileSync(configPath));

if (!process.argv[2]) {
  console.log('Usage - test_jwt_token payload (expiryMinutes)');
  process.exit(0);
}

if (process.argv[3]) {
	options.expiresInMinutes = process.argv[3];
}

console.log(jwt.sign(JSON.parse(process.argv[2]), config.jwtKey, options));