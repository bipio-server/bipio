bip-pod-twitter
===

	Pod 	= require '../bip-pod'
	twitter = require 'twitter'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class Twitter extends Pod

		constructor: (@auth) ->
			@

		on_new_tweet: (action) ->
			d = Q.defer()

			self = @

			process.nextTick () ->
				self._client = new twitter self.auth
				self._client.stream 'statuses/filter', action.config, (stream) ->
					d.resolve Rx.Observable.fromEvent stream, "data"

			d.promise

	module.exports = Twitter