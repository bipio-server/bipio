Config
======

	module.exports = (config) ->

		keys = require './keys'

		config.api = 
			host: 'localhost'
			port: 5000

		config.db =
			host: "localhost"
			port: 28015
			db: 'bipio'
			authKey: keys.db

		config.oauth =

			twitter:
				consumerKey: "#{keys.twitter.consumerKey}",
				consumerSecret: "#{keys.twitter.consumerSecret}",
				callbackURL: "http://#{config.api.host}:#{config.api.port}/rpc/oauth/twitter/cb"

			slack: keys.slack


		config