/*
 * Copyright (c) 2014 Narciso Jaramillo. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, browser: true */
/*global $, define, brackets */

define(function (require, exports) {
    "use strict";

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        ProjectManager     = brackets.getModule("project/ProjectManager"),
        AppInit            = brackets.getModule("utils/AppInit"),
        BowerRc            = require("src/bower/BowerRc"),
        Event              = require("src/events/Events"),
        EventEmitter       = require("src/events/EventEmitter"),
        FileUtils          = require("src/utils/FileUtils");

    var _bowerRc    = null,
        _defaultConfiguration = {},
        _reloadedCallback;

    function createConfiguration(path) {
        if (!path || path.trim() === "") {
            var currentProject =  ProjectManager.getProjectRoot();

            if (currentProject) {
                path = currentProject.fullPath;
            } else {
                var promise = new $.Deferred();
                promise.reject();

                return promise;
            }
        }

        _bowerRc = new BowerRc(path, _defaultConfiguration);

        return _bowerRc.create();
    }

    function removeConfiguration() {
        var deferred = new $.Deferred();

        if (_bowerRc !== null) {
            _bowerRc.remove().done(function () {
                _bowerRc = null;

                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }

        return deferred;
    }

    function getBowerRc() {
        return _bowerRc;
    }

    function open() {
        if (_bowerRc !== null) {
            _bowerRc.open();
        }
    }

    function getConfiguration() {
        var config;

        if (_bowerRc !== null) {
            config = _bowerRc.Data;
        } else {
            config = _defaultConfiguration;
        }

        return config;
    }

    /**
     * Checks if the file exists in the given directory. If the directory
     * is not set, the root project directory is taken as the default directory.
     * @param {string} path
     * @return {Promise}
     */
    function findConfiguration(path) {
        if (!path) {
            var promise = new $.Deferred();
            promise.reject();

            return promise;
        }

        path += ".bowerrc";

        return FileUtils.exists(path);
    }

    function _loadConfiguration(path) {
        _bowerRc = new BowerRc(path, _defaultConfiguration);
    }

    /**
     * Creates the default configuration based on those settings defined
     * in brackets preferences.
     */
    function _setUpDefaultConfiguration() {
        var proxy = PreferencesManager.get("proxy");

        if (proxy) {
            _defaultConfiguration.proxy = proxy;
            _defaultConfiguration.httpsProxy = proxy;
        }
    }

    function _notifyBowerRcReloaded() {
        if (typeof _reloadedCallback === "function") {
            _reloadedCallback();
        }
    }

    function _loadBowerRcAtCurrentProject() {
        // search for the configuration file if it exists
        var currentProject = ProjectManager.getProjectRoot(),
            defaultPath = (currentProject) ? currentProject.fullPath : null;

        findConfiguration(defaultPath).then(function () {
            _loadConfiguration(defaultPath);
        }).fail(function () {
            _bowerRc = null;
        }).always(function () {
            _notifyBowerRcReloaded();
        });
    }


    /**
     * Callback when the default preferences change. If the "proxy" preference has changed,
     * create the default configuration with the new value.
     * @param {Array} preferencesChanged Array of preferences keys that could have changed.
     */
    function _onPreferencesChange(preferencesChanged) {
        if (!_defaultConfiguration) {
            return;
        }

        var indexProxy = preferencesChanged.indexOf("proxy");

        if (indexProxy !== -1) {
            var proxy = PreferencesManager.get("proxy");

            if (_defaultConfiguration.proxy !== proxy) {
                _setUpDefaultConfiguration();

                if (_bowerRc !== null) {
                    _bowerRc.setDefaults(_defaultConfiguration);
                }
            }
        }
    }

    function _onConfigurationCreated() {
        if (_bowerRc !== null) {
            return;
        }

        _loadBowerRcAtCurrentProject();
    }

    function _onConfigurationChanged() {
        if (_bowerRc === null) {
            return;
        }

        _bowerRc.reload().done(function () {
            _bowerRc.setDefaults(_defaultConfiguration);
        });
    }

    function _onBowerRcDeleted() {
        _bowerRc = null;
        _notifyBowerRcReloaded();
    }

    function onBowerRcReloaded(callback) {
        _reloadedCallback = callback;
    }

    function _init() {
        _setUpDefaultConfiguration();

        AppInit.appReady(function () {
            _loadBowerRcAtCurrentProject();
        });

        EventEmitter.on(Event.BOWER_BOWERRC_CREATE, _onConfigurationCreated);
        EventEmitter.on(Event.BOWER_BOWERRC_CHANGE, _onConfigurationChanged);
        EventEmitter.on(Event.BOWER_BOWERRC_DELETE, _onBowerRcDeleted);
        EventEmitter.on(Event.PROJECT_CHANGE, _loadBowerRcAtCurrentProject);

        PreferencesManager.on("change", function (event, data) {
            _onPreferencesChange(data.ids);
        });
    }

    _init();

    exports.getBowerRc          = getBowerRc;
    exports.createConfiguration = createConfiguration;
    exports.removeConfiguration = removeConfiguration;
    exports.getConfiguration    = getConfiguration;
    exports.findConfiguration   = findConfiguration;
    exports.open                = open;
    exports.onBowerRcReloaded   = onBowerRcReloaded;
});
