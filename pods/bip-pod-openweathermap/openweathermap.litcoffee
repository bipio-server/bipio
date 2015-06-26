bip-pod-openweathermap
===

	Pod 	= require '../bip-pod'
	Weather = require 'node-openweathermap'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class OpenWeatherMap extends Pod

		constructor: (auth) ->
			@_client = new Weather
			@_client.defaults = { units: 'metric', lang: 'en', mode: 'json' }
			@

		weather_now: (action) ->
			self = @
			d = Q.defer()

			next = (obj) ->
				process.nextTick () ->
					self._client.now self.Transform(action.config, action.transforms, obj)

			d.resolve Rx.Observer.create next, console.error, console.log

			d.promise

	module.exports = OpenWeatherMap
