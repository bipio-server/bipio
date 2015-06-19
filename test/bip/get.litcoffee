### Bip GET REST Resource Test

Unit tests for any bip-related GET endpoints.

	fs = require 'fs'
	path = require 'path'
	colors = require 'colors'
	moment = require 'moment'
	chai = require 'chai'
	keys = require
	request = require 'request'
	chai.should()
	config = require('../../config')({})
	testConfig = require '../config.json'
	app = require('../../server')(5999)

Begin tests.

	describe 'GET', () ->

		it 'setup', (done) ->
			
			testBip = {
				id: '12345',
				name: 'testBip',
				type: 'trigger',
				nodes: [
					{
						v: "twitter.on_new_tweet",
						value: {
							id: "twitter.on_new_tweet",
							type: "trigger",
							config: {
								track: 'IoT'
							}
						}
					},
					{
						v: "slack.post_to_channel",
						value: {
							id: "slack.post_to_channel",
							type: "http",
							config: {
								text: 'Default Text', # sane default, will be overridden by transforms
								channel: '#iotwitter',
								username: 'IoTwitter',
								icon_emoji: ':bipio:',
								unfurl_links: true,
								link_names: 1
							}
							transforms: {
								text: "{text}"
								username: "{user.screen_name} - {user.location}"
							}
						}
					}
				],
				edges: [
					{
						v: "twitter.on_new_tweet",
						w: "slack.post_to_channel"
					}
				]
			}

			request { url: "http://localhost:5999/rest/bip/12345", method: "POST", headers: { "content-type": "application/json" }, json: true, body: testBip }, (err, res, body) ->
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
			
			request 'http://localhost:5999/rest/bip/12345', (err, res, body) ->
				res.statusCode.should.equal 200
				done()

#### [/rpc/bip/start] 

should return the bip with matching id

		it '/rpc/bip/start', (done) ->
			
			request 'http://localhost:5999/rpc/bip/12345/start', (err, res, body) ->
				res.statusCode.should.equal 200
				done()
				
		it 'teardown', (done) ->
			#request { url: "http://localhost:5999/rest/bip/12345", method: "DELETE" }, (err, res, body) ->
			#	res.statusCode.should.equal 200
			#	app.kill()
			#	done()
			done()


