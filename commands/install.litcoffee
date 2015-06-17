#### `bipio install`

Command handler for `bipio install` command.

	es = require 'event-stream'
	fs = require 'fs'
	path = require 'path'
	mkdir = require 'mkdirp'
	path = require('path')
	pkg = require(path.join(__dirname, '../package.json'))
	prompt = require('prompt')
	crypto = require 'crypto'
	keys = null

	module.exports = (args, end) ->

Detect whether this is a new install or not

		try 
			keys = require '../config/keys'
		catch error
			console.log "Installing new API...".yellow

If this is a pod install, begin the pod install prompt.

		if keys
			prompt.message = '[Bipio][Pod Install]'.cyan

			# If you `bipio install` from a folder that has a config/keys.json in it, we are side-eyeing you like so.
			end "Is there already a Bipio API installed? Backup the old keys and remove them, then try `bipio install` again.".red if not args[3]

			# Select pod from the command. `bipio install twitter`, for example, will trigger the 'twitter' switch statement case.
			properties = switch args[3]
				when 'slack' then {
					clientID: {
						description: "Slack Client ID"
						type: 'string'
						hidden: true
					}
					clientSecret: {
						description: "Slack Client Secret"
						type: 'string'
						hidden: true
					}
				}
				when 'twitter' then {
					consumerKey: {
						description: "Twitter Consumer Key"
						type: 'string'
						hidden: true
					}
					consumerSecret: {
						description: "Twitter Consumer Secret"
						type: 'string'
						hidden: true
					}

				}

			prompt.get {
					properties: properties
				}, (err, result) ->
					end err.red if err
					keys.pods[args[3]] = result

					# Update the keys for the pod.
					fs.writeFile path.join(__dirname, "../config/keys.json"), JSON.stringify(keys), (err) ->
						if err
							throw new Error err
						else
							end "New Keys written to #{path.join(__dirname, "../config/keys.json")}" 

If this is a new install, begin the new install prompt.

		else
			keys = {}
			prompt.message = '[Bipio][New Install]'.cyan

			# Here are the questions posed to users on first install.

			prompt.get { 
				properties: {
					host: {
						description: "API Host"
						type: 'string'
						pattern: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
						message: 'Must be a valid hostname'
						default: 'localhost'
						required: true
					}
					port: {
						description: "API TCP Port"
						type: 'string'
						pattern: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/
						message: "Must be valid TCP port number"
						default: 5000
						required: true
					}
					username: {
						description: 'Your name'
						type: 'string'
						pattern: /^[A-Z\"]+$/i
						message: "Username must contain only the characters A-Z|a-z"
						default: 'admin'
					}
					AESkey: {
						description: 'API key (optional, [Enter] to generate automatically)'
						type: 'string'
						hidden: true
						pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,}$/
						message: 'Key must have a minimum of 8 characters, at least 1 letter, 1 number and 1 Special Character within.'
					}
					db_host: {
						description: "DB Host (optional, [Enter] to use API's host)"
						type: 'string'
						pattern: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
						message: 'Must be a valid hostname'
					}
					ssl: {
						description: "Enable SSL?"
						type: 'boolean'
						default: false
					}
				}
			}, (err, result) ->
				end err.red if err

				# Construct a new keys object.

				keys.api =
					host: result.host
					port: result.port

				keys.db =
					host: if result.db_host.length > 0 then result.db_host else result.host
					port: 28015
					db: "bipio"
					authKey: ""

				keys.pods = {}

				# TODO encrypt AES key, create account_auth, domain, and other admin user stuff.

				# Write the keys to new file `config/keys.json`.
				fs.writeFile path.join(__dirname, "../config/keys.json"), JSON.stringify(keys, null, 4), (err) ->
					if err
						throw new Error err
					else
						end "New Keys written to #{path.join(__dirname, "../config/keys.json")}" 
						end "Installation Complete!".green

			