bip-pod-twitter
===

	Pod 	= require '../bip-pod'
	twitter = require 'twitter'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class Twitter extends Pod

		constructor: (@auth) ->
			@_client = new twitter @auth
			@

		on_new_tweet: (action) ->
			self = @
			d = Q.defer()

			self._client.stream 'statuses/filter', action.config, (stream) ->
				d.resolve Rx.Observable.fromEvent stream, "data"
				stream = null

			d.promise

	module.exports = Twitter