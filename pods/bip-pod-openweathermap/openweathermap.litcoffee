bip-pod-openweathermap
===

	Pod 	= require '../bip-pod'
	Weather = require 'node-openweathermap'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class OpenWeatherMap extends Pod

		constructor: (auth) ->
			@weather = new Weather
			@weather.defaults = { units: 'metric', lang: 'en', mode: 'json' }
			@

		weather_now: (action) ->
			self = @
			d = Q.defer()

			next = (obj) ->
				self.weather.now self.Transform(action.config, action.transforms, obj)

			d.resolve Rx.Observer.create next, error, complete

			d.promise

	module.exports = OpenWeatherMap
