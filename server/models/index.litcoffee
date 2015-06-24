### Model Base Class

	class Model
		constructor: () ->
			return @

###### `toJSON`

Converts model to JSON representation.

		toJSON: () ->
			obj = {}
			for key, value of @schema

				obj[key] = @[key] if typeof @[key] is value
			return obj

	module.exports = Model