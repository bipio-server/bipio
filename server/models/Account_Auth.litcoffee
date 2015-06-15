### Account Auth

Auth profiles for accounts.

	uuid = require 'node-uuid'
	bcrypt = require 'bcrypt'
	crypto = require 'crypto'
	config = require '../../config'

	class AccountAuth

		constructor: (object) ->
			@type = object.type

			switch @type
				when 'token'
					@username = object.username
				when 'oauth'
					@oauth_provider = ''
					@oauth_refresh = ''
					@oauth_profile = ''
					@oauth_token_expire = ''

			@id = if object.hasOwnProperty 'id' then object.id else uuid.v4()
			@owner_id = object.owner_id
			@

		strCryptSync: (str) ->
			bcrypt.hashSync(str, bcrypt.genSaltSync(10))

		strCryptCmpSync: (taintedClear, localHash) ->
			bcrypt.compareSync(taintedClear, localHash)

		AESCrypt: (value) ->
			iv = crypto.randomBytes(32).toString('hex').substr(0, 16);
			
			# get latest key
			key = config.k[keyVersion] for keyVersion in config.k

			cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
			crypted = cipher.update(value, 'ascii', 'base64') + cipher.final('base64')
			cryptEncoded = new Buffer(keyVersion + iv + crypted).toString('base64')

			cryptEncoded;

	module.exports = AccountAuth

