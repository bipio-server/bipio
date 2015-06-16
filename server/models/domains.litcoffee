### Domains

Domains for bip.io accounts

	dns = require 'dns'

##### Domain schema

	schema = 
		id: 'string'
		owner_id: 'string'
		name: 'string'
		type: 'string'
		_available: 'boolean'


	class Domain extends Model

		constructor: (object) ->
			super schema
			@id = if object?.id then object.id 
			@name = if object?.name then object.name.toLowerCase() else 'localhost'
			@_available = id object?._available then object._available else false

			return @


		verify: (name) ->
			return true if name else return false


		setToAvailable: () ->
			@_available = true
			
			return @

		module.exports = Domain
