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
# Example
	{
		"id": {string},
		"secret": {string}
		"callback": {string}
	}
```

To use it here, it must be written below like this:

```
# Example
	config.oauth.foo = 
		id: "#{keys.pods.foo.id}"
		secret: "#{keys.pods.foo.secret}"
		callback: "http://#{config.api.host}:#{config.api.port}/rpc/oauth/foo/cb"

```

The following code aims to automate this so you don't have to add per-pod custom objects, but if you need to, do it like above.

Consult the documentation for your own Passport module for more details.

		config.oauth = {}
		
		for pod of keys.pods
			config.oauth[pod] = {}
			config.oauth[pod][key] = value for key, value of keys.pods[pod]
			config.oauth[pod]["callbackURL"] = "http://#{config.api.host}:#{config.api.port}/rpc/oauth/#{pod}/cb"

		return config