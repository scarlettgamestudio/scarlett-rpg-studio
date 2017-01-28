/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc', '$rootScope', '$translate', '$uibModal', '$http', '$compile', 'scarlettSvc', 'constants', 'sceneSvc', '$timeout', 'modalSvc',
    function ($scope, logSvc, soapSvc, config, userSvc, $rootScope, $translate, $uibModal, $http, $compile, scarlettSvc, constants, sceneSvc, $timeout, modalSvc) {

        var myLayout = null;
        var activeModal = null;
        var activeWindows = {};
        var sceneHierarchyLayoutConfiguration = {
            type: 'component',
            componentName: 'template',
            width: 22,
            componentState: {
                templateId: constants.WINDOW_TYPES.SCENE_HIERARCHY,
                url: 'templates/sceneHierarchy/sceneHierarchy.html'
            },
            title: $translate.instant("EDITOR_SCENE_HIERARCHY")
        };
        var sceneViewLayoutConfiguration = {
            type: 'component',
            componentName: 'template',
            componentState: {
                templateId: constants.WINDOW_TYPES.SCENE_VIEW,
                url: 'templates/sceneView/sceneView.html'
            },
            title: $translate.instant("EDITOR_SCENE_VIEW")
        };
        var propertyEditorLayoutConfiguration = {
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
        var contentBrowserLayoutConfiguration = {
            type: 'component',
            height: 38,
            minWidth: 340,
            componentName: 'template',
            componentState: {
                templateId: constants.WINDOW_TYPES.PROJECT_EXPLORER,
                url: 'templates/contentBrowser/contentBrowser.html'
            },
            title: $translate.instant("EDITOR_CONTENT_BROWSER")
        };
        var consoleLayoutConfiguration = {
            type: 'component',
            componentName: 'template',
            componentState: {
                templateId: constants.WINDOW_TYPES.CONSOLE,
                url: ''
            },
            height: 25,
            title: $translate.instant("EDITOR_CONSOLE")
        };
        var defaultLayoutConfiguration = {
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

        $scope.model = {
            onlineMode: userSvc.isLoggedIn()
        };

        $scope.openContentBrowser = function () {
            modalSvc.showModal("contentBrowser", {}, "md");
        };

        $scope.openNewProjectModal = function () {
            activeModal = $uibModal.open({
                animation: true,
                templateUrl: "modals/newProject/newProjectModal.html",
                controller: "NewProjectModalCtrl",
                size: 200
            });
        };

        $scope.showWindow = function (configuration) {
            // is window already active?
            if (activeWindows[configuration.componentState.templateId]) {
                return;
            }

            //myLayout.createDragSource("#editor-container", consoleLayoutConfiguration);
            //myLayout.selectedItem.addChild( consoleLayoutConfiguration );
            myLayout.root.contentItems[0].addChild(configuration);
        };

        $scope.showConsole = function () {
            $scope.showWindow(consoleLayoutConfiguration);
        };

        $scope.showProjectExplorer = function () {
            $scope.showWindow(contentBrowserLayoutConfiguration);
        };

        $scope.showSceneHierarchy = function () {
            $scope.showWindow(sceneHierarchyLayoutConfiguration);
        };

        $scope.showSceneView = function () {
            $scope.showWindow(sceneViewLayoutConfiguration);
        };

        $scope.showInspector = function () {
            $scope.showWindow(propertyEditorLayoutConfiguration);
        };

        $scope.openLoadProject = function () {
            scarlettSvc.promptLoadProject();
        };

        $scope.save = function () {
            // save active scene:
            sceneSvc.saveActiveScene();

            // save project data:
            scarlettSvc.saveProject();
        };

        $scope.logout = function () {
            // call of user service logout, it will handle ui view changes as well:
            userSvc.logout();
        };

        $scope.safeDigest = function () {
            !$scope.$$phase && $scope.$digest();
        };

        // initialization
        (function init() {
            // there is an active project assigned?
            if (!isObjectAssigned(scarlettSvc.activeProject)) {
                // no ? we can't be in this view without an active project..
                $rootScope.changeView("hub");
                return;
            }

            $scope.userInfo = userSvc.getUserInfo();

            myLayout = new GoldenLayout(scarlettSvc.getLayoutConfiguration() || defaultLayoutConfiguration, "#editor-container");

            myLayout.on('itemDestroyed', function (item) {
                if (item.config && item.config.componentState && item.config.componentState.templateId) {
                    // delete from the active windows:
                    delete activeWindows[item.config.componentState.templateId];
                }
            });

            myLayout.registerComponent('template', function (container, state) {
                if (container._config && container._config.componentState && container._config.componentState.templateId) {
                    // add to active windows:
                    activeWindows[container._config.componentState.templateId] = true;
                }

                if (state.url && state.url.length > 0) {
                    $http.get(state.url, {cache: true}).then(function (response) {
                        // compile the html so we have all angular goodies:
                        let html = $compile(response.data)($scope);
                        container.getElement().html(html);

                        // assign events here:
                        container.on("resize", function () {
                            $scope.$broadcast(constants.EVENTS.CONTAINER_RESIZE, state.templateId);
                        });

                        if (state.templateId == "inspector") {
                            // do stuff here?
                        }
                    });
                }
            });

            myLayout.on('stateChanged', function () {
                scarlettSvc.storeLayoutConfiguration(myLayout.toConfig());
            });

            myLayout.on('initialised', function () {

            });

            $scope.onWindowResize = function () {
                myLayout.updateSize();
            };

            $scope.onKeyDown = function (e) {
                let keys = [e.keyCode];

                if (e.ctrlKey) {
                    keys.push(Keys.Ctrl);
                }

                if (e.shiftKey) {
                    keys.push(Keys.Shift);
                }

                // update the keyboard data:
                Keyboard.addKeys(keys);
            };

            $scope.onKeyUp = function (e) {
                // note: in the editor
                let keys = [e.keyCode];

                if (e.ctrlKey) {
                    keys.push(Keys.Ctrl);
                }

                if (e.shiftKey) {
                    keys.push(Keys.Shift);
                }

                // update the keyboard data:
                Keyboard.removeKeys(keys);

                // controller behaviors:

                // undo
                if (e.ctrlKey && e.keyCode == 90) {
                    AngularHelper.commandHistory.undo();
                    $rootScope.$broadcast(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED);
                }

                // redo
                if (e.ctrlKey && e.keyCode == 89) {
                    AngularHelper.commandHistory.redo();
                    $rootScope.$broadcast(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED);
                }
            };

            $scope.onWindowBlur = function (e) {
                // clear stuff that might generate issues:
                Keyboard.clearKeys();
            };

            $scope.onWindowFocus = function (e) {

            };

            $timeout((function () {
                // running this under the $timeout guarantees that the controller will be initialized only when the base
                // html is rendered, therefore having correct size calculations (important).
                myLayout.init();

                window.addEventListener("resize", $scope.onWindowResize);
                window.addEventListener("keyup", $scope.onKeyUp);
                window.addEventListener("keydown", $scope.onKeyDown);
                window.addEventListener("blur", $scope.onWindowBlur);
                window.addEventListener("focus", $scope.onWindowFocus);

            }).bind(this), 10);

        })();
    }]
);