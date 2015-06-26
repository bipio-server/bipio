### Bip POST REST Resource Test

Unit tests for any bip-related GET endpoints.

	fs = require 'fs'
	path = require 'path'
	colors = require 'colors'
	moment = require 'moment'
	chai = require 'chai'
	keys = require '../../config/keys'
	request = require 'request'
	chai.should()
	config = require('../../config')({})
	testConfig = require '../config.json'
	#app = require('../../server')({port: 5999})

Begin tests.

	describe 'POST', () ->

		it 'setup', (done) ->
			
			testBip = {
				"active": true,
				"edges": [
					{
						"v": "http.on_new_payload",
						"w": "slack.post_to_channel"
					}
				],
				"id": "fghij",
				"name": "testHttpBip",
				"nodes": [
					{
						"v": "http.on_new_payload",
						"value": {
							"id": "fghij",
							"type": "trigger"
						}
					},
					{
						"v": "slack.post_to_channel",
						"value": {
							"config": {
								"channel": "#bip_io",
								"icon_emoji": ":bipio:",
								"link_names": 1,
								"text": "Default Text",
								"unfurl_links": "true",
								"username": "Bipio 0.5.0"
							},
							"id": "fghij",
							"transforms": {
								"text": "{body.message}"
							},
							"type": "http"
						}
					}
				],
				"type": "http",
				"url": "http://bip.wot.io:5999/bip/http/fghij"
			}

			request { url: "http://localhost:5999/rest/bip/fghij", method: "POST", headers: { "content-type": "application/json" }, json: true, body: testBip }, (err, res, body) ->
				res.statusCode.should.equal 200
				done()

#### [/bip/http/:id] 

should send a payload to a HTTP Webhook bip
		
		it '/bip/http/:id', (done) ->
			
			###setInterval () ->
				request 'http://localhost:5999/rest/bip/fghij', (err, res, body) ->
					res.statusCode.should.equal 200
					done()
				, 1000
				request { url: 'http://localhost:5999/bip/http/fghij', method: "POST", headers: { "content-type": "application/json" }, json: true, body: { message: Date.now() } }, (err, res, body) ->
					res.statusCode.should.equal 200
					done()
				, 1000###
			done()
		
		###it 'teardown', (done) ->
			request { url: "http://localhost:5999/rest/bip/fghij", method: "DELETE" }, (err, res, body) ->
				res.statusCode.should.equal 200
				app.kill()
				done()###