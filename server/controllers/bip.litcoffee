### Bip Controller

Handles bip-specific endpoints.

	Bip = require "../models/bips"
	Rx = require 'rx'

	module.exports = (app) ->

		return {

###### `start`

Starts a Bip by adding it to the [Job Queue](../utilities/bastion.litcoffee#addJob).

			start: (req, res, next) ->
				job = app.bastion.addJob "bips", { do: "activate", to: req.params.id }
				job.then (written) ->
					res.status(200).json {status: "ok"}

###### `pause`

Pauses a Bip

			pause: (req, res, next) ->
				job = app.bastion.addJob "bips", { do: "pause", to: req.params.id }
				job.then (written) ->
					res.status(200).json {status: "ok"}

###### `send`

Sends a payload to an http Bip.

			send: (req, res, next) ->
				# TODO check domains, auth
				job = app.bastion.addJob "bips", { do: "send", with: { body: req.body }, to: req.params.id }
				job.then (written) ->
					res.status(200).json {status: "ok"}

		}