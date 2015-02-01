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
/*global $, define */

define(function (require, exports) {
    "use strict";

    var BowerMetadata  = require("src/bower/BowerMetadata"),
        Bower          = require("src/bower/Bower");

    /**
     * Bower json file constructor.
     * @param {path} path
     * @constructor
     */
    function BowerJson(path, appName) {
        BowerMetadata.call(this, "bower.json", path);

        this._appName = appName;
    }

    BowerJson.prototype = Object.create(BowerMetadata.prototype);
    BowerJson.prototype.constructor = BowerJson;
    BowerJson.prototype.parentClass = BowerMetadata.prototype;

    BowerJson.prototype.content = function () {
        var that = this,
            deferred  = new $.Deferred(),
            packageMetadata;

        Bower.list(this.ProjectPath).then(function (result) {
            packageMetadata = result.pkgMeta;
        }).fail(function () {
            packageMetadata = that._getDefaultData();
        }).always(function () {
            var content = JSON.stringify(packageMetadata, null, 4);

            deferred.resolve(content);
        });

        return deferred;
    };

    BowerJson.prototype.createWithCurrentData = function () {
        var that = this,
            deferred = new $.Deferred(),
            defaultData = this._getDefaultData(),
            content = JSON.stringify(defaultData, null, 4);

        this.saveContent(content).then(function () {

            return Bower.list(that.ProjectPath);
        }).then(function (result) {

            var pkgMeta = that._createPackageMetadata(result);
            content = JSON.stringify(pkgMeta, null, 4);

            return that.saveContent(content);
        }).then(function () {

            deferred.resolve(content);
        }).fail(function () {

            deferred.reject();
        });

        return deferred;
    };

    BowerJson.prototype._createPackageMetadata = function (result) {
        var pkg = {
            name: result.pkgMeta.name,
            dependencies: {},
            devDependencies: {}
        };

        var dependencies = result.dependencies,
            dependencyName,
            dependency;

        for (dependencyName in dependencies) {
            if (dependencies.hasOwnProperty(dependencyName)) {
                dependency = dependencies[dependencyName];

                pkg.dependencies[dependencyName] = dependency.update.target;
            }
        }

        return pkg;
    };

    BowerJson.prototype._getDefaultData = function () {
        return {
            name: this._appName || "your-app-name",
            dependencies: {},
            devDependencies: {}
        };
    };

    return BowerJson;
});
