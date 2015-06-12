bip-pod-twitter
===

	Pod 	= require '../bip-pod'
	Twitter = require 'twitter'
	Q 		= require 'q'
	Rx 		= require 'rx'

	class Twitter extends Pod

		constructor: (auth) ->
			@_client = new Twitter auth
			@

		on_new_tweet: (action) ->
			d = Q.defer()

			@_client.stream 'statuses/filter', action.config, (stream) ->
				d.resolve Rx.Observable.fromEvent stream, "data"

			d.promise

	module.exports = Twitter