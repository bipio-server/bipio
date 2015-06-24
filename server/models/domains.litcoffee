### Domains

Domains for bip.io accounts

	Model = require './index'
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
			@_available = if object?._available then object._available else false

			return @

###### `verify`

{Waiting for description}

		verify: (name) ->
			if /.?localhost$/.test(name) 
				setToAvailable
				return true
			else return false

###### `setToAvailable`

{Waiting for description}

		setToAvailable: () ->
			@_available = true
			

		module.exports = Domain
