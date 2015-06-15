### Account Auth

Auth profiles for accounts.

	uuid = require 'node-uuid'
	bcrypt = require 'bcrypt'
	crypto = require 'crypto'
	config = require '../../config'

###### Account_Auth schema

	schema =
		id: 'string'
		type: 'string'
		password: 'string'
		username: 'string'
		key: 'string'
		owner_id: 'string'
		auth_provider: 'string'
		oauth_provider: 'string'
		oauth_refresh: 'string'
		oauth_token_expire: 'number'
		oauth_profile: 'string'

	schemaNotMatching = "Does Not Match Schema"

	class AccountAuth

		constructor: (object) ->
			@type = if object?.type then object.type else 'token'
			@id = if object.hasOwnProperty 'id' then object.id else uuid.v4()
			@owner_id = if object?.owner_id then object.owner_id else throw new Error schemaNotMatching

			switch @type
				when 'token'
					@username = if object?.username then @cryptSave object.username else throw new Error schemaNotMatching
					@password = if object?.password then @cryptSave object.password else throw new Error schemaNotMatching
					@key = if object?.key then @cryptSave object.key else throw new Error schemaNotMatching
				when 'oauth'
					@oauth_provider = ''
					@oauth_refresh = ''
					@oauth_profile = ''
					@oauth_token_expire = ''

			return @

		strCryptSync: (str) ->
			return bcrypt.hashSync(str, bcrypt.genSaltSync(10))

		strCryptCmpSync: (taintedClear, localHash) ->
			return bcrypt.compareSync(taintedClear, localHash)

		AESCrypt: (value) ->
			iv = crypto.randomBytes(32).toString('hex').substr(0, 16);
			
			# get latest key
			key = config.k[keyVersion] for keyVersion in config.k

			cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
			crypted = cipher.update(value, 'ascii', 'base64') + cipher.final('base64')
			cryptEncoded = new Buffer(keyVersion + iv + crypted).toString('base64')

			return cryptEncoded

		cryptSave: (value) ->
			if value
				crypted = value

				# passwords get
				if @type == 'login_primary' or @type == 'login_sub'
					app.error "Trying to write login primary to account_auth [#{@id}]"
					throw new Error('Bad Type')
				else if @type != 'token_invite'
					crypted = @AESCrypt(value)
				return crypted
			else
				return value

		toJSON: () ->
			obj = {}
			for key, value in schema
				obj[key] = @[key] if typeof @[key] is value


	module.exports = AccountAuth

