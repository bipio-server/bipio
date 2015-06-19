Config
======

	module.exports = (config) ->

		keys = require './keys'

		config.api = keys.api

		config.db = keys.db

		config.amqp = keys.amqp

###### Oauth Passport Strategy Configuration

All keys here must conform to the name of its own [Passport Strategy](http://passportjs.org/), and the object structure must match that expected by its strategy.

For example, assume that `passport-foo`'s strategy is configured with an object like: 

```
# Example Code, Not Executed
	{
		"id": {string},
		"secret": {string}
		"callback": {string}
	}
```

To use it here, it must be written below like this:

```
# Example Code, Not Executed
	if keys.pods?.foo
		config.oauth.foo = {
			id: "#{keys.pods.foo.id}"
			secret: "#{keys.pods.foo.secret}"
			callback: "http://#{config.api.host}:#{config.api.port}/rpc/oauth/foo/cb"
		}

```

Consult the documentation for your own Passport module for more details.

		config.oauth = {}
		
		if keys.pods?.twitter
			config.oauth.twitter = {
				"consumerKey": "#{keys.pods.twitter.consumer_key}",
				"consumerSecret": "#{keys.pods.twitter.consumer_secret}"
				"callbackURL": "http://#{config.api.host}:#{config.api.port}/rpc/oauth/twitter/cb"
			}

		if keys.pods?.slack
			config.oauth.slack = {
				"clientID": "#{keys.pods.slack.clientID}",
				"clientSecret": "#{keys.pods.slack.clientSecret}"
			}

		return config