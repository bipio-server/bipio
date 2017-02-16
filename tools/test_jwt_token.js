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