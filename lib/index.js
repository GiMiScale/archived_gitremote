var config = require('./config');
var service = require('./service');

var run = function(done) {
	service.setup(config, function() {});
};

module.exports.run = run;