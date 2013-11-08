var fs = require('fs');
var path = require('path');
var nconf = require('nconf');

var environment;
var configPath = path.join(path.dirname(fs.realpathSync(__filename)), '..');

if (typeof process.env.NODE_ENV === 'undefined') {
  environment = 'development';
} else {
  environment = process.env.NODE_ENV;
}

nconf
  .argv()
  .env()
  .file('etc', {
    file: path.join('/etc/gitremote', 'config' + '.' + environment + '.json')
  })
  .file('config', {
    file: path.join(configPath, 'config' + '.' + environment + '.json')
  })
  .file('defaults', {
    file: path.join(configPath, 'defaults.json')
  });

module.exports = nconf;