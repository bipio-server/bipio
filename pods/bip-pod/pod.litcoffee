bip-pod
===

	_ = require 'underscore'

	class Pod

		constructor: () ->
			console.log "New Pod instantiated: #{this}"

		Transform: (config, transforms, data) ->

			getKeys = (prev, curr, index, array) -> prev[curr]

			paths = _.mapObject transforms, (transform, key) -> transform.match(/{([^}]+)}/g)
			replacements = _.mapObject paths, (paths, index) -> paths.map (path) -> path.substring(1,path.length-1).split('.').reduce(getKeys, data)
			
			for own key, transform of transforms
				transform = transform.replace(///#{paths[key][index]}///, replacement) for index, replacement of replacements[key]
				config[key] = transform

			config

	module.exports = Pod