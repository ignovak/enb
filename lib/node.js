var Vow = require('vow'),
    fs = require('fs'),
    colors = require('colors'),
    path = require('path');

function Node(nodePath, dirname, techs, cache) {
    this._path = nodePath;
    this._dirname = dirname;
    this._targetName = path.basename(nodePath);
    this._techs = techs;
    this._cache = cache;
    this._nodeCache = cache.subCache(path);
    this._logger = null;
    this._targetNames = {};
    this._cache = {};
    this._env = null;
    this._targetNamesToBuild = null;
}

Node.prototype = {
    setLogger: function(logger) {
        this._logger = logger;
    },

    getLogger: function() {
        return this._logger;
    },

    getDir: function() {
        return this._dirname;
    },

    getPath: function() {
        return this._path;
    },

    setEnv: function(env) {
        this._env = env;
    },

    getEnv: function() {
        return this._env;
    },

    setTargetsToBuild: function(targetsToBuild) {
        this._targetNamesToBuild = targetsToBuild;
    },

    resolvePath: function(filename) {
        return this._dirname + '/' + filename;
    },

    loadTechs: function() {
        var _this = this;
        return Vow.all(this._techs.map(function(t) {
            return t.init(_this);
        }).filter(function(t) {
            return Vow.isPromise(t);
        }));
    },

    _getTarget: function(name) {
        var targets = this._targetNames, target;
        if (!(target = targets[name])) {
            target = targets[name] = {started: false};
        }
        if (!target.promise) {
            target.promise = Vow.promise();
        }
        return target;
    },

    getTargetName: function(suffix) {
        return this._targetName + (suffix ? '.' + suffix : '');
    },

    _registerTarget: function(target, tech) {
        var targetObj = this._getTarget(target);
        if (targetObj.tech) {
            throw Error(
                'Concurrent techs for target: ' + target + ', techs: "' + targetObj.tech.getName() + '" vs "' + tech.getName() + '"'
            );
        }
        targetObj.tech = tech;
    },

    resolveTarget: function(target, value) {
        var targetObj = this._getTarget(target);
        this._logger.logAction('resolved', target
            + (targetObj.startTime ? ' - ' + colors.red((new Date() - targetObj.startTime) + 'ms') : '')
            + colors.grey(' ~' + targetObj.tech.getName())
        );
        return targetObj.promise.fulfill(value);
    },

    rejectTarget: function(target, err) {
        this._logger.logErrorAction('failed', target);
        return this._getTarget(target).promise.reject(err);
    },

    requireSources: function(sources) {
        var _this = this;
        return Vow.all(sources.map(function(source) {
            var targetObj = _this._getTarget(source);
            if (!targetObj.tech) {
                throw Error('There is no tech for target ' + source + '.');
            }
            if (!targetObj.started) {
                targetObj.started = true;
                targetObj.startTime = new Date();
                try {
                    targetObj.tech.build().then(null, function(err) {
                        _this.rejectTarget(source, err);
                    });
                } catch (err) {
                    _this.rejectTarget(source, err);
                }
            }
            return targetObj.promise;
        }));
    },

    build: function(target, buildCache) {
        var _this = this;
        this.buildCache = buildCache || {};

        return Vow.all(this._techs.map(function (t) {
                return t.getTargets();
            })).then(function (targetLists) {
                for (var i = 0, l = _this._techs.length; i < l; i++) {
                    targetLists[i].forEach(function (targetName) {
                        _this._registerTarget(targetName, _this._techs[i]);
                    });
                }
                var targetsToBuild = _this._targetNamesToBuild;
                if (target) {
                    targetsToBuild = [target];
                }
                if (!targetsToBuild) {
                    targetsToBuild = Object.keys(_this._targetNames);
                }
                return _this.requireSources(targetsToBuild);
            });
    },

    getNodeCache: function(subCache) {
        return subCache ? this._nodeCache.subCache(subCache) : this._nodeCache;
    }
};

module.exports = Node;