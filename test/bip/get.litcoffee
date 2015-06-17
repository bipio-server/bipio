### Bip GET REST Resource Test

Unit tests for any bip-related GET endpoints.

	fs = require 'fs'
	path = require 'path'
	colors = require 'colors'
	moment = require 'moment'
	chai = require 'chai'
	request = require 'request'
	chai.should()
	config = require('../../config')({})
	testConfig = require '../config.json'
	app = require('../../server')(5999)

Begin tests.

	describe 'GET', () ->

		it 'setup', (done) ->
			
			testBip =
				id: '12345'
				name: 'testBip'
				type: 'http'
				options: {}

			request { url: "http://localhost:5999/rest/bip/12345", method: "POST", headers: { "content-type": "application/json" }, json: true, body: testBip }, (err, res, body) ->
				res.statusCode.should.equal 200
				done()

#### [/rest/bip] should return a list of Bips in the 'bips' table.
		
		it '/rest/bip', (done) ->
			
			request 'http://localhost:5999/rest/bip', (err, res, body) ->
				res.statusCode.should.equal 200
				done()

#### [/rest/bip/:id] should return the bip with matching id

		it '/rest/bip/:id', (done) ->
			
			request 'http://localhost:5999/rest/bip/12345', (err, res, body) ->
				res.statusCode.should.equal 200
				done()
				
		it 'teardown', (done) ->
			request { url: "http://localhost:5999/rest/bip/12345", method: "DELETE" }, (err, res, body) ->
				res.statusCode.should.equal 200
				app.kill()
				done()


