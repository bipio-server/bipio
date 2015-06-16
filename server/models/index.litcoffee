### Model Base Class

	class Model
		constructor: (@schema) ->
			return @
		
		toJSON: () ->
			obj = {}
			for key, value in @schema
				obj[key] = @[key] if typeof @[key] is value
			return obj

	module.exports = Model

