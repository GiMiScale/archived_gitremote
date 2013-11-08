var path = require('path');
var restify = require('restify');
var bunyan = require('bunyan');
var fs = require('fs');
var _ = require('lodash');
var git = require('git');

var Logger;

var setupSslConfig = function(config) {
  var sslConfig = {};
  try {
    sslConfig.certificate = fs.readFileSync(config.get('server:certificate'));
    sslConfig.key = fs.readFileSync(config.get('server:key'));
  } catch(e) {
    Logger.warn('Setting up HTTPS was not succesful, proceeding with HTTP setup');
  }
  return sslConfig;
};

var setup = function (config, callback) {
  /**
   * Logging
   */

  Logger = bunyan.createLogger({
    name: config.get('logging:name'),
    streams: [{
      path: path.join(config.get('logging:dir'), config.get('logging:file'))
    }],
    level: config.get('logging:level')
  });

  var serverConfig = {
    name: config.get('server:name'),
    version: config.get('server:defaultVersion'),
    acceptable: config.get('server:acceptable'),
    log: Logger
  };

  /**
   * Setup SSL if config is present
   */
  var sslConfig = setupSslConfig(config);
  serverConfig = _.extend(serverConfig, sslConfig);


  /**
   * Server
   */
  var server = restify.createServer(serverConfig);

  /**
   * Server plugins
   */
  var throttleOptions = {
    rate: config.get('server:throttleRate'),
    burst: config.get('server:throttleBurst'),
    ip: false,
    username: true
  };

  server.pre([
    restify.authorizationParser(),
  ]);

  server.use([
    restify.acceptParser(server.acceptable),
    restify.dateParser(),
    restify.fullResponse(),
    restify.bodyParser(),
    restify.gzipResponse()
  ]);

  server.get('/', function(req, res, next) {
    res.send({
      "name": config.get('server:name'),
      "version": config.get('server:defaultVersion')
    });

    return next();
  });

  server.get('/:project', function(req, res, next) {
    if (typeof config.get('projects:' + req.params.project) === 'undefined') {
      return next(new restify.ResourceNotFoundError('Unknown project: ' + req.params.project));
    }

    var gitPath = config.get('projects:' + req.params.project + ':path');

    var repo = new git.Repo(gitPath, function(err, repo) {
      if (err) return next(err);

      repo.head(function(err, result) {
        if (err) return next(err);

        res.send(result);
        return next();
      });
    });
  });

  server.get('/:project/pull', function(req, res, next) {
    if (typeof config.get('projects:' + req.params.project) === 'undefined') {
      return next(new restify.ResourceNotFoundError('Unknown project: ' + req.params.project));
    }

    var gitPath = config.get('projects:' + req.params.project + ':path');

    var repo = new git.Repo(gitPath, function(err, repo) {
      if (err) return next(err);

      repo.git.git('pull', function(err, result) {
        if (err) return next(err);

        res.send({result: result});
        return next();
      });
    });
  });

  /**
   * Request / Response Logging
   */
  server.on('after', restify.auditLogger({
    log: Logger
  }));

  server.listen(config.get('server:port'), function () {
    callback(server);
  });
};

module.exports.setup = setup;