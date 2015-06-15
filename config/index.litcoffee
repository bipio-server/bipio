Config
======

	module.exports = (config) ->

		keys = require './keys'

		config.api = keys.api

		config.db = keys.db

###### Oauth Passport Strategy Configuration

All keys here must conform to the name of its own [Passport Strategy](http://passportjs.org/), and the object structure must match that expected by its strategy..

For example, assume that `passport-foo`'s strategy is configured with an object like: 

```
	{
		"id": {string},
		"secret": {string}
		"callback": {string}
	}
```

To use it here, it must be written below like this:

```
	foo: 
		id: "#{reference to keys{"
		secret: "#{reference to keys}"
		callback: "http://#{config.api.host}:#{config.api.port}/rpc/oauth/foo/cb"

```

		config.oauth =

			twitter:
				consumerKey: "#{keys.pods.twitter.consumerKey}",
				consumerSecret: "#{keys.pods.twitter.consumerSecret}",
				callbackURL: "http://#{config.api.host}:#{config.api.port}/rpc/oauth/twitter/cb"

			slack: 
				clientID: "#{keys.pods.slack.clientID}",
				clientSecret: "#{keys.pods.slack.clientSecret}"

		return config