/**
 * Created by John
 */

app.factory("scarlettSvc", function ($rootScope, config, logSvc, dataSvc, $q, constants) {
    let SCARLETT_FOLDER_NAME = ".scarlett";

    let svc = {};

    svc.activeProject = null;
    svc.activeProjectPath = null;
    svc.activeProjectFileMap = null;

    function getAllFilesInDirectory(directory, deep) {
        let files = [];

        directory.files.forEach(function (fileInfo) {
            let filename = Path.getFilename(fileInfo.relativePath);
            let extension = Path.getFileExtension(filename);

            // don't include private/hidden files
            if (filename[0] !== "." && config.IGNORED_FILE_EXTENSIONS.indexOf(extension) < 0) {
                files.push(fileInfo.relativePath);
            }
        });

        if (deep) {
            directory.subdirectories.forEach(function (subdirectory) {
                files = files.concat(getAllFilesInDirectory(subdirectory, deep));
            });
        }

        return files;
    }

    svc.promptLoadProject = function () {
        let params = {
            filters: [{name: 'Scarlett Project', extensions: ['sc']}]
        };

        NativeInterface.openFileBrowser(ScarlettInterface.getApplicationFolderPath(), params, function (result) {
            if (result !== false && result.endsWith(".sc")) {
                svc.openProject(result);
            } else {
                // TODO: show dialog:
                //dialogSvc.showDialog("","","");
            }
        });
    };

    svc.updateActiveProjectFileMap = function () {
        return svc.activeProjectFileMap = NativeInterface.mapDirectory(svc.activeProjectPath);
    };

    svc.getAllActiveProjectFilePaths = function () {
        return getAllFilesInDirectory(svc.activeProjectFileMap, true);
    };

    /**
     * Initializes and performs validation procedures on a Scarlett Project
     * @param project
     * @param path
     */
    svc.setupProject = function (project, path) {
        // base procedures:
        svc.activeProjectPath = path;


        // integrity validations
        if (!project.hasOwnProperty("settings")) {
            project["settings"] = {};
        }

        if (!project.hasOwnProperty("editor")) {
            project["editor"] = {};
        }

        if (!project["editor"].hasOwnProperty("layout")) {
            project["editor"]["layout"] = null;
        }

        if (!project.hasOwnProperty("content")) {
            project["content"] = {};
        }

        // the project already has files assigned?
        if (!project.editor.hasOwnProperty("files")) {
            // it doesn't, we need to map all existing files on the directory then.
            project.editor.files = svc.getAllActiveProjectFilePaths();
        }

        svc.saveProject(project);
    };

    /**
     * Returns the previously stored layout configuration (if any)
     */
    svc.getLayoutConfiguration = function () {
        if (!isObjectAssigned(svc.activeProject)) {
            return null;
        }

        return svc.activeProject.editor.layout;
    };

    /**
     * Stores the active layout configuration into the active project editor layout state. This operation doesn't
     * automatically update the project file on system, project save() is required to store changes into disk.
     * @param configuration
     */
    svc.storeLayoutConfiguration = function (configuration) {
        if (!isObjectAssigned(svc.activeProject)) {
            return;
        }

        svc.activeProject.editor.layout = configuration;
    };

    /**
     * Saves a given project. If no project is provided, the active project is selected for saving
     * @param project
     */
    svc.saveProject = function (project) {
        project = project || svc.activeProject;

        if (project) {
            NativeInterface.writeFile(
                Path.wrapDirectoryPath(svc.activeProjectPath) + "project.sc",
                Objectify.createDataString(project, true)
            );
        }
    };

    /**
     * Load a project folder from a specific path
     * @param path
     * @returns {Promise}
     */
    svc.loadProjectFolder = function (path) {
        let defer = $q.defer();
        let fileMap = [
            {
                "id": "project",
                "path": Path.wrapDirectoryPath(path) + SCARLETT_FOLDER_NAME + Path.TRAILING_SLASH + "project.json"
            },
            {
                "id": "workspace",
                "path": Path.wrapDirectoryPath(path) + SCARLETT_FOLDER_NAME + Path.TRAILING_SLASH + "workspace.json"
            }
        ];

        NativeInterface.readFiles(fileMap, (result) => {
            let projectDataString = result["project"];
            let workspaceDataString = result["workspace"];
            let projectData, workspaceData;

            if (!isObjectAssigned(projectDataString)) {
                // the project file failed to load, loading cannot continue..
                defer.reject();
                return;

            } else {
                // try to parse project data string..
                try {
                    projectData = Objectify.restoreFromString(projectDataString);

                } catch (error) {
                    // the project data failed while parsing..
                    defer.reject(error);
                }
            }

            if (isObjectAssigned(workspaceDataString)) {
                try {
                    workspaceData = Objectify.restoreFromString(projectData);

                } catch (error) {
                    // the project data failed while parsing..
                    workspaceData = new WorkspaceFile();
                }
            }

            if (!isObjectAssigned(workspaceData)) {
                logSvc.warn("Could not reload workspace data, creating new instance..");

                // currently there is no major issue if the workspace could not be loaded, so we can create a new
                // instance in order to proceed..
                workspaceData = Objectify.restoreFromString(projectData);
            }

            // update the active project file map:
            svc.updateActiveProjectFileMap();

            // update active project:
            GameManager.activeProject = projectData;
            //GameManager.
            GameManager.activeProjectPath = Path.wrapDirectoryPath(path);

            /*if (result === false) {
                // the file failed to load..
                defer.reject(error);

            } else {
                try {
                    let gameProject = Objectify.restoreFromString(result);

                    if (!isObjectAssigned(gameProject)) {
                        logSvc.warn("Unable to load game project, invalid project file source");
                        defer.reject();
                    }

                    svc.setupProject(gameProject, Path.getDirectory(path));

                    GameManager.activeProject = gameProject;
                    GameManager.activeProjectPath = Path.wrapDirectoryPath(Path.getDirectory(gamefilePath));

                    defer.resolve(gameProject);

                } catch (error) {
                    // the project failed while parsing..
                    defer.reject(error);
                }
            }*/
        });

        return defer.promise;
    };

    svc.getActiveProject = function () {
        return svc.activeProject;
    };

    svc.getActiveProjectPath = function () {
        return Path.wrapDirectoryPath(svc.activeProjectPath);
    };

    svc.setActiveProjectPath = function (path) {
        svc.activeProjectPath = path;
        GameManager.activeProjectPath = Path.wrapDirectoryPath(Path.getDirectory(path));
    };

    svc.setActiveProject = function (project) {
        svc.activeProject = project;
        GameManager.activeProject = project;

        // broadcast the event so other components know
        $rootScope.$broadcast(constants.EVENTS.PROJECT_LOADED, project);
    };

    svc.createFullPath = function (relativePath) {
        return svc.getActiveProjectPath() + relativePath;
    };

    svc.openProject = function (path) {
        svc.loadProjectFolder(path).then(
            function (gameProject) {
                svc.setActiveProject(gameProject);

                // update the lastUpdated property
                let savedData = dataSvc.findByProperty("projects", "path", path);
                if (savedData) {
                    savedData.lastUpdate = new Date().getTime();

                } else {
                    dataSvc.push("projects", {
                        name: gameProject.name,
                        path: path,
                        lastUpdate: new Date().getTime()
                    });
                }

                dataSvc.save();

                // show the main view
                $rootScope.changeView('main');

            }, function (error) {
                // TODO: warn the user and remove the project from the datasvc
            })
    };

    return svc;
});