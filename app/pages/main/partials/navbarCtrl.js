app.controller('NavbarCtrl',
    ['$scope', 'logSvc', 'soapSvc', 'config', 'layoutSvc', 'sceneSvc',
        function ($scope, logSvc, soapSvc, config, layoutSvc, sceneSvc) {

            $scope.$on(AngularHelper.constants.EVENTS.COMMAND_HISTORY_CHANGED, function() {
                $scope.safeDigest();
            });

            $scope.editGameScene = function() {
                EventManager.emit(AngularHelper.constants.EVENTS.OBJECTS_SELECTION, [sceneSvc.getActiveGameScene()]);
            };

            $scope.showConsole = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.CONSOLE);
            };

            $scope.showProjectExplorer = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.PROJECT_EXPLORER);
            };

            $scope.showSceneHierarchy = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.SCENE_HIERARCHY);
            };

            $scope.showAtlasEditor = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.ATLAS_EDITOR);
            };

            $scope.showSceneView = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.SCENE_VIEW);
            };

            $scope.showInspector = function () {
                layoutSvc.addWindow(constants.WINDOW_TYPES.INSPECTOR);
            };

            $scope.safeDigest = function () {
                !$scope.$$phase && $scope.$digest();
            };

            $scope.canUndo = function () {
                return AngularHelper.commandHistory.canUndo();
            };

            $scope.canRedo = function () {
                return AngularHelper.commandHistory.canRedo();
            };

            $scope.undo = function () {
                if ($scope.canUndo()) {
                    AngularHelper.commandHistory.undo();
                    AngularHelper.rootScope.$broadcast(AngularHelper.constants.EVENTS.GAME_OBJECT_UPDATED);
                }
            };

            $scope.isToolActive = function (id) {
                return EditorGameScene.activeTransformTool == id;
            };

            $scope.setActiveTool = function (id) {
                EditorGameScene.activeTransformTool = id;
            };

            $scope.redo = function () {
                if ($scope.canRedo()) {
                    AngularHelper.commandHistory.redo();
                    AngularHelper.rootScope.$broadcast(AngularHelper.constants.EVENTS.GAME_OBJECT_UPDATED);
                }
            };
        }]
);

