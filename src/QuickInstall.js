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

define(function (require, exports, module) {
    "use strict";

    var QuickOpen      = brackets.getModule("search/QuickOpen"),
        StringMatch    = brackets.getModule("utils/StringMatch"),
        StringUtils    = brackets.getModule("utils/StringUtils");

    var StatusBarController = require("src/StatusBarController").Controller,
        QuickSearchSpinner  = require("src/QuickSearchSpinner").create(),
        PackageManager      = require("src/bower/PackageManager"),
        Preferences         = require("src/preferences/Preferences"),
        Strings             = require("strings");

    var queue = [],
        failed = [],
        packages,
        packageListPromise,
        installPromise,
        _latestQuery,
        _lastFetchTime,
        _isFetching = false;

    function _installNext() {
        if (installPromise || queue.length === 0) {
            return;
        }

        var pkgName       = queue.shift(),
            installingMsg = StringUtils.format(Strings.STATUS_INSTALLING_PKG, pkgName),
            statusId      = StatusBarController.post(installingMsg, true);

        var save           = Preferences.get(Preferences.settings.QUICK_INSTALL_SAVE),
            dependencyType = PackageManager.PRODUCTION_DEPENDENCY;

        installPromise = PackageManager.install(pkgName, null, dependencyType, save);

        installPromise.done(function (result) {
            StatusBarController.update(statusId, StringUtils.format(Strings.STATUS_PKG_INSTALLED, pkgName), false);
            StatusBarController.remove(statusId);

            // disabled for now...
            //window.setTimeout(function () {
            //    ProjectManager.showInTree(FileSystem.getDirectoryForPath(result.installationDir));
            //}, 1000);

        }).fail(function (error) {
            // Make sure the user sees the error even if other packages get installed.
            failed.push(pkgName);
        }).always(function () {
            installPromise = null;

            if (queue.length === 0) {
                if (failed.length > 0) {
                    var errorMessage = StringUtils.format(Strings.STATUS_ERROR_INSTALLING, failed.join(", "));
                    StatusBarController.update(statusId, errorMessage, false);
                    StatusBarController.remove(statusId);
                    failed = [];
                }
            } else {
                _installNext();
            }
        });
    }

    function _addToQueue(pkgName) {
        queue.push(pkgName);

        _installNext();
    }

    function quickOpenBower() {
        QuickOpen.beginSearch("+", "");
    }

    function _match(query) {
        // TODO: doesn't seem to work if no file is open. Bug in Quick Open?
        return (query.length > 0 && query.charAt(0) === "+");
    }

    function _resetFetchStatusIfNeeded() {
        var curTime = Date.now(),
            maxTimeFetch = Preferences.get(Preferences.settings.RELOAD_REGISTRY_TIME) * 60000; // minutes to milliseconds

        if (!_isFetching && (_lastFetchTime === undefined || (curTime - _lastFetchTime > maxTimeFetch))) {
            // Re-fetch the list of packages if it's been more than 10 minutes since the last time we fetched them.
            packages = null;
            packageListPromise = null;
            _lastFetchTime = curTime;
        }
    }

    function _getSortedPackages(pkgs) {
        pkgs.sort(function (pkg1, pkg2) {
            var name1 = pkg1.name.toLowerCase(),
                name2 = pkg2.name.toLowerCase();

            return (name1 < name2 ? -1 : (name1 === name2 ? 0 : 1));
        });

        return pkgs;
    }

    function _fetchPackageList() {
        var result = new $.Deferred();

        _isFetching = true;

        PackageManager.listCache().then(function (pkgs) {
            if (pkgs.length !== 0) {
                packages = _getSortedPackages(pkgs);
            }

            return PackageManager.search();
        }).done(function (pkgs) {
            packages = _getSortedPackages(pkgs);

            result.resolve();
        }).fail(function (error) {

            result.reject(error);
        }).always(function () {

            _isFetching = false;
        });

        return result;
    }

    function _search(query, matcher) {
        // Remove initial "+"
        query = query.slice(1);

        _latestQuery = query;

        _resetFetchStatusIfNeeded();

        if (!packages) {
            // Packages haven't yet been fetched. If we haven't started fetching them yet, go ahead and do so.
            if (!packageListPromise) {
                var message = Strings.STATUS_BOWER_LOADING;

                packageListPromise = new $.Deferred();

                QuickSearchSpinner.show();

                var statusId = StatusBarController.post(message, true);

                _fetchPackageList()
                    .done(function () {
                        message = Strings.STATUS_BOWER_READY;

                        packageListPromise.resolve();
                    })
                    .fail(function () {
                        message = Strings.STATUS_BOWER_NOT_LOADED;

                        packageListPromise.reject();
                    })
                    .always(function () {
                        QuickSearchSpinner.hide();
                        StatusBarController.update(statusId, message, false);
                        StatusBarController.remove(statusId);
                    });
            }

            // Due to bugs in smart autocomplete, we have to return separate promises for each call
            // to _search, but make sure to only resolve the last one.
            var result = new $.Deferred();

            packageListPromise.done(function () {
                // validate for an empty string avoids an exception in smart autocomplete
                if (query === _latestQuery && query.trim() !== "") {
                    try {
                        result.resolve(_search(_latestQuery, matcher));
                    } catch (exception) {
                        console.log(exception);
                        result.reject();
                    }
                } else {
                    result.reject();
                }

                packageListPromise = null;
            });

            return result.promise();
        }

        // Filter and rank how good each match is
        var filteredList = $.map(packages, function (pkg) {
            var searchResult = matcher.match(pkg.name, query);

            if (searchResult) {
                searchResult.pkg = pkg;
            }
            return searchResult;
        });

        // Sort based on ranking & basic alphabetical order
        StringMatch.basicMatchSort(filteredList);

        return filteredList;
    }

    function _itemSelect(result) {
        if (result) {
            _addToQueue(result.pkg.name);
        }
    }

    function init(domainPath) {
        QuickOpen.addQuickOpenPlugin({
            name: "installFromBower",
            languageIds: [],
            search: _search,
            match: _match,
            itemSelect: _itemSelect,
            label: Strings.TITLE_QUICK_OPEN
        });
    }

    exports.init           = init;
    exports.quickOpenBower = quickOpenBower;
});
