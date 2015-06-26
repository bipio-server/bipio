### Account Auth

Auth profiles for accounts.
	
	Model = require './index'
	uuid = require 'node-uuid'
	bcrypt = require 'bcrypt'
	crypto = require 'crypto'
	keys = require '../../config/keys'

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
		oauth_profile: 'object'

	schemaNotMatching = "Does Not Match Schema"

	class AccountAuth extends Model

		constructor: (object) ->
			super schema
			@type = if object?.type then object.type else 'token'
			@id = if object?.id then object.id else uuid.v4()
			@owner_id = if object?.owner_id then object.owner_id else console.error schemaNotMatching

			switch @type
				when 'token'
					@username = if object?.username then @cryptSave object.username else console.error schemaNotMatching
					@password = if object?.password then @cryptSave object.password else console.error schemaNotMatching
					#@key = if object?.key then @cryptSave object.key else throw new Error schemaNotMatching

				when 'oauth'
					@oauth_provider = ''
					@oauth_refresh = ''
					@oauth_profile = ''
					@oauth_token_expire = ''

			return @

###### `strCryptSync`

{Waiting for description}

		strCryptSync: (str) ->
			return bcrypt.hashSync(str, bcrypt.genSaltSync(10))

###### `strCryptCompareSync`

{Waiting for description}

		strCryptCompareSync: (taintedClear, localHash) ->
			return bcrypt.compareSync(taintedClear, localHash)

###### `AESEncrypt`

{Waiting for description}

		AESEncrypt: (value) ->
			iv = crypto.randomBytes(32).toString('hex').substr(0, 16);
			
			# get latest key
			keyVersion = 0
			@key = keys.k[keyVersion]

			cipher = crypto.createCipheriv('aes-256-cbc', @key, iv)
			crypted = cipher.update(value, 'ascii', 'base64') + cipher.final('base64')
			encrypted = new Buffer(keyVersion + iv + crypted).toString('base64')

			return encrypted

###### `AESDecrypt`

{Waiting for description}

		AESDecrypt: (encryptedString) ->
			crypted = new Buffer(encryptedString, 'base64').toString('utf-8')
			keyVersion = crypted.substr(0, 1)
			iv = crypted.substr(1, 16)
			key = keys.k[keyVersion]
			cypher = crypted.substr(17)
			decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
			decipher.setAutoPadding true
			decrypted = decipher.update(cypher, 'base64', 'ascii') + decipher.final('ascii')

			return decrypted

###### `passwordHash`

{Waiting for description}

		passwordHash: (pwValue) ->
			crypted = undefined
			# tokens use AES
			if @type != 'login_primary' then (crypted = AESEncrypt(pwValue)) else (crypted = strCryptSync(pwValue))
			return crypted

###### `cryptSave`

{Waiting for description}

		cryptSave: (value) ->
			if value
				crypted = value

				# passwords get
				if @type == 'login_primary' or @type == 'login_sub'
					app.error "Trying to write login primary to account_auth [#{@id}]"
					throw new Error('Bad Type')
				else if @type != 'token_invite'
					crypted = @AESEncrypt(value)
				return crypted
			else
				return value

###### `cryptSaveObject`

{Waiting for description}

		cryptSaveObject: (value) ->
			return cryptSave(JSON.stringify(value))

		
	module.exports = AccountAuth

