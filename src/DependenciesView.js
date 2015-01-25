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
/*global define, Mustache */

define(function (require, exports) {
    "use strict";

    var template            = require("text!../templates/dependencies.html"),
        Strings             = require("../strings"),
        DependenciesManager = require("src/bower/DependenciesManager");

    var $panelSection;

    function _getViewData() {
        return {
            Strings: Strings,
            bowerJson: []
        };
    }

    function show() {
        var data = _getViewData(),
            sectionHtml;

        DependenciesManager.findBowerJson()
            .done(function (path) {
                data.bowerJson.push({ path: path });
            })
            .always(function () {
                sectionHtml = Mustache.render(template, data);

                $panelSection.append(sectionHtml);
            });
    }

    function _refreshUi() {
        $panelSection.empty();

        show();
    }

    function render($container) {
        $panelSection = $container;

        // callbacks

        function _onDeleteClick(event) {
            event.stopPropagation();

            DependenciesManager.removeBowerJson()
                .done(function () {
                    _refreshUi();
                });
        }

        function _onCreateClick() {
            DependenciesManager.createBowerJson()
                .done(function (path) {
                    if (path) {
                        DependenciesManager.open();
                        _refreshUi();
                    }
                });
        }

        function _onConfigListClick() {
            DependenciesManager.open();
        }

        $panelSection
            .on("click", "[data-bower-json-action='delete']", _onDeleteClick)
            .on("click", "[data-bower-json-action='create']", _onCreateClick)
            .on("click", "[data-bower-json]", _onConfigListClick);
    }

    function hide() {
        $panelSection.empty();
    }

    exports.render = render;
    exports.show   = show;
    exports.hide   = hide;
});