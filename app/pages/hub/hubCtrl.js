app.controller('HubCtrl', ['$rootScope', '$scope', 'logSvc', 'userSvc', 'config', '$uibModal', 'dataSvc', 'gameSvc', 'scarlettSvc',
	function ($rootScope, $scope, logSvc, userSvc, config, $uibModal, dataSvc, gameSvc, scarlettSvc) {

		var activeModal = null;

		$scope.model = {
			projects: []
		};

		$scope.openNewProjectModal = function () {
			activeModal = $uibModal.open({
				animation: true,
				templateUrl: "modals/newProject/newProjectModal.html",
				controller: "NewProjectModalCtrl",
				size: 200
			});
		};

		$scope.promptLoadProject = function() {
			scarlettSvc.promptLoadProject();
		};

		$scope.openProject = function (path) {
			scarlettSvc.openProject(path);
		};

		$scope.logout = function () {
			// call of user service logout, it will handle ui view changes as well:
			userSvc.logout();
		};

		(function init() {
			$scope.model.projects = dataSvc.get("projects");
		})()

	}
]);