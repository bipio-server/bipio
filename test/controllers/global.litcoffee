### Global Controller Test

Unit tests for the `global` controller. Any new methods added to `/server/controllers/global` should have matching tests here. 

	fs = require 'fs'
	path = require 'path'
	colors = require 'colors'
	moment = require 'moment'
	chai = require 'chai'
	chai.should()
	testConfig = require '../config.json'

Create mock server objects to pass through the tests

	req = {
		params: {}
		body: {}
	}
	res = {}
	app = {
		dialog: (str) -> console.log str.green if testConfig.console
		log: (str) -> console.log str.cyan if testConfig.console
		error: (str) -> throw new Error str.red if testConfig.console
		warn: (str) -> console.warn "[Warning]".yellow, str.yellow if testConfig.console
	}

Assign the controller

	controller = require("../../server/controllers/global")(app)

Begin tests.

	describe 'controllers.global', () ->

#### [before_all](../../server/controllers/global.litcoffee#before_all)
		
		it 'before_all', (done) ->

__Scenario:__ Any  
__Should:__ Display the time, method and original URL if `bipio test` is invoked with the `--console` flag.
			
			scenario_one = () ->

				req.method = 'GET'
				req.originalUrl = 'http://bip.io'

				controller.before_all req, res, done

			scenario_one()

