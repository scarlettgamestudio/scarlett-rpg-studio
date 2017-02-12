/**
 * Created by John
 */

app.factory("layoutSvc", function ($rootScope, $translate, $http, $compile, constants, scarlettSvc, logSvc) {
    let svc = {};
    let layout = null;
    let activeWindows = {};
    let windowMapping = {};
    let elemTarget = "";
    let sceneHierarchyLayoutConfiguration = {
        type: 'component',
        componentName: 'template',
        width: 22,
        componentState: {
            templateId: constants.WINDOW_TYPES.SCENE_HIERARCHY,
            url: 'templates/sceneHierarchy/sceneHierarchy.html'
        },
        title: $translate.instant("EDITOR_SCENE_HIERARCHY")
    };
    let sceneViewLayoutConfiguration = {
        type: 'component',
        componentName: 'template',
        componentState: {
            templateId: constants.WINDOW_TYPES.SCENE_VIEW,
            url: 'templates/sceneView/sceneView.html'
        },
        title: $translate.instant("EDITOR_SCENE_VIEW")
    };
    let atlasEditorLayoutConfiguration = {
        type: 'component',
        componentName: 'template',
        componentState: {
            templateId: constants.WINDOW_TYPES.SCENE_VIEW,
            url: 'templates/atlasEditor/atlasEditor.html'
        },
        title: $translate.instant("EDITOR_ATLAS_EDITOR")
    };
    let propertyEditorLayoutConfiguration = {
        type: 'component',
        width: 20,
        minWidth: 340,
        componentName: 'template',
        componentState: {
            templateId: constants.WINDOW_TYPES.INSPECTOR,
            url: 'templates/propertyEditor/propertyEditor.html'
        },
        title: $translate.instant("EDITOR_INSPECTOR")
    };
    let contentBrowserLayoutConfiguration = {
        type: 'component',
        height: 36,
        minWidth: 340,
        componentName: 'template',
        componentState: {
            templateId: constants.WINDOW_TYPES.PROJECT_EXPLORER,
            url: 'templates/contentBrowser/contentBrowser.html'
        },
        title: $translate.instant("EDITOR_CONTENT_BROWSER")
    };
    let scriptEditorLayoutConfiguration = {
        type: 'component',
        height: 36,
        minWidth: 340,
        componentName: 'template',
        componentState: {
            templateId: constants.WINDOW_TYPES.SCRIPT_EDITOR,
            url: 'templates/scriptEditor/scriptEditor.html'
        },
        title: $translate.instant("EDITOR_SCRIPT_EDITOR")
    };
    let consoleLayoutConfiguration = {
        type: 'component',
        componentName: 'template',
        componentState: {
            templateId: constants.WINDOW_TYPES.CONSOLE,
            url: ''
        },
        height: 25,
        title: $translate.instant("EDITOR_CONSOLE")
    };
    let defaultLayoutConfiguration = {
        settings: {
            hasHeaders: true,
            showPopoutIcon: false
        },
        labels: {
            close: $translate.instant("ACTION_CLOSE"),
            maximise: $translate.instant("ACTION_MAXIMIZE"),
            minimise: $translate.instant("ACTION_MINIMIZE"),
            popout: $translate.instant("ACTION_POPOUT")
        },
        dimensions: {
            borderWidth: 4,
            headerHeight: 20,
        },
        content: [{
            type: 'row',
            content: [
                {
                    type: 'column',
                    content: [
                        {
                            type: 'row',
                            content: [
                                sceneHierarchyLayoutConfiguration,
                                sceneViewLayoutConfiguration
                            ]
                        },
                        contentBrowserLayoutConfiguration
                    ]
                },
                propertyEditorLayoutConfiguration,
            ]
        }]
    };

    svc.isWindowOpen = function(identification) {
        return activeWindows.hasOwnProperty(identification);
    };

    svc.addWindow = function(identification) {
        if (!isObjectAssigned(layout)) {
            logSvc.warn("The layout manager is not initialized");
            return;
        }

        if (!windowMapping.hasOwnProperty(identification)) {
            logSvc.warn("Unable to add unidentified window");
            return;
        }

        // is window already active?
        if (svc.isWindowOpen(identification)) {
            logSvc.warn("Unable to add an already active window");
            return;
        }

        //myLayout.createDragSource("#editor-container", windowMapping[identification]);
        //myLayout.selectedItem.addChild( windowMapping[identification] );
        layout.root.contentItems[0].addChild(windowMapping[identification]);
    };

    svc.createLayout = function (target) {
        elemTarget = target;

        if (isObjectAssigned(layout)) {
            logSvc.warn("The layout manager is already initialized. Call destroy() before creating a new instance.");
            return;
        }

        layout = new GoldenLayout(scarlettSvc.getLayoutConfiguration() || defaultLayoutConfiguration, target);

        layout.on('itemDestroyed', function (item) {
            if (item.config && item.config.componentState && item.config.componentState.templateId) {
                if (activeWindows[item.config.componentState.templateId].scope) {
                    // call the scope.$destroy() so there are no memory leaks!
                    activeWindows[item.config.componentState.templateId].scope.$destroy();
                }

                // delete from the active windows:
                delete activeWindows[item.config.componentState.templateId];

                // broadcast event
                EventManager.emit(constants.EVENTS.WINDOW_REMOVED, item.config.componentState.templateId);
            }
        });

        layout.registerComponent('template', function (container, state) {
            if (container._config && container._config.componentState && container._config.componentState.templateId) {
                // add to active windows:
                activeWindows[container._config.componentState.templateId] = {
                    scope: null
                };
            }

            if (state.url && state.url.length > 0) {
                $http.get(state.url, {cache: true}).then(function (response) {
                    // compile the html so we have all angular goodies:
                    let newScope = $rootScope.$new();
                    let html = $compile(response.data)(newScope);
                    container.getElement().html(html);

                    // store the window scope:
                    activeWindows[container._config.componentState.templateId].scope = newScope;

                    // assign events here:
                    container.on("resize", function () {
                        $rootScope.$broadcast(constants.EVENTS.CONTAINER_RESIZE, state.templateId);
                    });

                    // broadcast event
                    EventManager.emit(constants.EVENTS.WINDOW_ADDED, container._config.componentState.templateId);
                });
            }
        });

        layout.on('stateChanged', function () {
            scarlettSvc.storeLayoutConfiguration(layout.toConfig());
        });

        layout.on('initialised', function () {
            // ..
        });

        layout.on('tabChanged', function(args) {
            try {
                let windowId = args._activeContentItem.config.componentState.templateId;
                if (isObjectAssigned(windowId)) {
                    $rootScope.$broadcast(constants.EVENTS.CONTAINER_RESIZE, windowId);
                }
            } catch(e) {
                logSvc.error("Failure while processing tab changed event: " + e);
            }
        });
    };

    svc.destroyLayout = function () {
        if (!isObjectAssigned(layout)) {
            logSvc.warn("The layout manager is not initialized");
            return;
        }

        layout.destroy();
        layout = null;
        activeWindows = {};

        EventManager.emit(AngularHelper.constants.EVENTS.LAYOUT_DESTROYED);
    };

    svc.restoreToDefault = function() {
        scarlettSvc.storeLayoutConfiguration(defaultLayoutConfiguration);
        svc.destroyLayout();
        svc.createLayout(elemTarget);
        svc.initLayout();
    };

    svc.updateSize = function () {
        if (!isObjectAssigned(layout)) {
            logSvc.warn("The layout manager is not initialized");
            return;
        }

        layout.updateSize();
    };

    svc.initLayout = function () {
        if (!isObjectAssigned(layout)) {
            logSvc.warn("The layout manager is not initialized");
            return;
        }

        layout.init();
    };

    (function init() {
        windowMapping[constants.WINDOW_TYPES.SCENE_HIERARCHY] = sceneHierarchyLayoutConfiguration;
        windowMapping[constants.WINDOW_TYPES.ATLAS_EDITOR] = atlasEditorLayoutConfiguration;
        windowMapping[constants.WINDOW_TYPES.CONSOLE] = consoleLayoutConfiguration;
        windowMapping[constants.WINDOW_TYPES.SCENE_VIEW] = sceneViewLayoutConfiguration;
        windowMapping[constants.WINDOW_TYPES.PROJECT_EXPLORER] = contentBrowserLayoutConfiguration;
        windowMapping[constants.WINDOW_TYPES.INSPECTOR] = propertyEditorLayoutConfiguration;
        windowMapping[constants.WINDOW_TYPES.SCRIPT_EDITOR] = scriptEditorLayoutConfiguration;
    })();

    return svc;
});
