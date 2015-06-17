### Domains

Domains for bip.io accounts

	dns = require 'dns'
	Model = require './index'

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
			@_available = if id object?._available then object._available else false

			return @


		verify: (name) ->
			if name
				return true
			else return false


		setToAvailable: () ->
			@_available = true
			
			return @

		module.exports = Domain
