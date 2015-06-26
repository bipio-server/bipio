### Bip GET REST Resource Test

Unit tests for any bip-related GET endpoints.

	fs = require 'fs'
	path = require 'path'
	colors = require 'colors'
	moment = require 'moment'
	chai = require 'chai'
	request = require 'request'
	keys = require '../../config/keys'
	chai.should()
	config = require('../../config')({})
	testConfig = require '../config.json'
	#app = require('../../server')({port: 5999})

Begin tests.

	describe 'GET', () ->

		it 'setup', (done) ->
			
			testBip = {
				"active": false,
				"edges": [
					{
						"v": "twitter.on_new_tweet",
						"w": "slack.post_to_channel"
					}
				],
				"id": "abcde",
				"name": "testBip",
				"nodes": [
					{
						"v": "twitter.on_new_tweet",
						"value": {
							"config": {
								"track": "IoT"
							},
							"id": "abcde",
							"type": "trigger"
						}
					},
					{
						"v": "slack.post_to_channel",
						"value": {
							"config": {
								"channel": "#iotwitter",
								"icon_emoji": ":bipio:",
								"link_names": 1,
								"text": "Default Text",
								"unfurl_links": "true",
								"username": "IoTwitter"
							},
							"id": "abcde",
							"transforms": {
								"text": "{text}",
								"username": "{user.screen_name} - {user.location}"
							},
							"type": "http"
						}
					}
				],
				"type": "trigger"
			}

			request { url: "http://localhost:5999/rest/bip/abcde", method: "POST", headers: { "content-type": "application/json" }, json: true, body: testBip }, (err, res, body) ->
				res.statusCode.should.equal 200
				done()

#### [/rest/bip] 

should return a list of Bips in the 'bips' table.
		
		it '/rest/bip', (done) ->
			
			request 'http://localhost:5999/rest/bip', (err, res, body) ->
				res.statusCode.should.equal 200
				done()

#### [/rest/bip/:id] 

should return the bip with matching id

		it '/rest/bip/:id', (done) ->
			request 'http://localhost:5999/rest/bip/abcde', (err, res, body) ->
				res.statusCode.should.equal 200
				done()
		
		it 'teardown', (done) ->
			request { url: "http://localhost:5999/rest/bip/abcde", method: "DELETE" }, (err, res, body) ->
				res.statusCode.should.equal 200
				app.kill()
				done()

