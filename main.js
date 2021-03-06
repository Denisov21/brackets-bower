/*
 * Copyright (c) 2013 Narciso Jaramillo. All rights reserved.
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
/*global define, brackets */

define(function (require, exports, module) {
    "use strict";

    var ExtensionUtils    = brackets.getModule("utils/ExtensionUtils"),
        NodeDomain        = brackets.getModule("utils/NodeDomain"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        Menus             = brackets.getModule("command/Menus"),
        AppInit           = brackets.getModule("utils/AppInit");

    // local modules
    var Bower          = require("src/bower/Bower"),
        GitChecker     = require("src/utils/GitChecker"),
        ProjectManager = require("src/bower/ProjectManager"),
        QuickInstall   = require("src/QuickInstall"),
        ErrorDialog    = require("src/dialogs/ErrorDialog"),
        Strings        = require("strings"),

    // controllers
        PanelController         = require("src/PanelController"),
        ConfigurationController = require("src/ConfigurationController"),
        DependenciesController  = require("src/DependenciesController");

    var EXTENSION_NAME         = "albertinad.bracketsbower",
        CMD_QUICK_INSTALL      = EXTENSION_NAME + ".installFromBower",
        CMD_PANEL              = EXTENSION_NAME + ".togglePanel",
        KEY_INSTALL_FROM_BOWER = "Ctrl-Alt-B";

    var panelController;

    /**
     * Show or hide the bower panel.
     */
    function _togglePanel() {
        panelController.toggle();
    }

    /**
     * Show QuickSearch for Bower searching.
     */
    function _showQuickInstall() {
        QuickInstall.quickOpenBower();
    }

    function _initializeControllers() {
        // initialize controllers
        var controllersMap = {
            "dependencies": {
                constructor: DependenciesController,
                isActive: true
            },
            "config": {
                constructor: ConfigurationController
            }
        };

        panelController = new PanelController();
        panelController.initialize(EXTENSION_NAME, controllersMap);
    }

    function init() {
        var path        = ExtensionUtils.getModulePath(module, "/node/BowerDomain"),
            bowerDomain = new NodeDomain("bower", path);

        ExtensionUtils.loadStyleSheet(module, "assets/fonts/octicon.css");
        ExtensionUtils.loadStyleSheet(module, "assets/styles.css");

        Bower.setDomain(bowerDomain);
        GitChecker.setDomain(bowerDomain);

        QuickInstall.init();

        _initializeControllers();

        var panelCmd   = CommandManager.register(Strings.TITLE_BOWER, CMD_PANEL, _togglePanel),
            installCmd = CommandManager.register(Strings.TITLE_SHORTCUT, CMD_QUICK_INSTALL, _showQuickInstall),
            fileMenu   = Menus.getMenu(Menus.AppMenuBar.FILE_MENU),
            viewMenu   = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);

        fileMenu.addMenuDivider();
        fileMenu.addMenuItem(installCmd);
        viewMenu.addMenuItem(panelCmd);

        KeyBindingManager.addBinding(CMD_QUICK_INSTALL, {
            key: KEY_INSTALL_FROM_BOWER
        });

        AppInit.appReady(function () {
            GitChecker.findGitOnSystem().fail(function () {
                panelController.updateStatus(PanelController.WARNING);

                ErrorDialog.showWarning(Strings.GIT_NOT_FOUND_TITLE, Strings.GIT_NOT_FOUND_DESCRIPTION);
            });

            ProjectManager.initialize();

            panelController.showIfNeeded();
        });
    }

    init();
});
