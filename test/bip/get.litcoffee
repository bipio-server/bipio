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

#### [/rest/bip] should return a list of Bips in the 'bips' table.
		
		it '/rest/bip', (done) ->
			
			request 'http://localhost:5999/rest/bip', (err, res, body) ->
				res.statusCode.should.equal 200
				done()
