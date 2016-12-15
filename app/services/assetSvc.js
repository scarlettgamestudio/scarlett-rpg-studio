/**
 * Created by John
 */

app.factory("assetSvc", function (config, logSvc, scarlettSvc, $q) {

    var svc = {};

    svc._assetExtensions = [".atl"];
    svc._assetCache = {};

    svc.clearCache = function () {
        svc._assetCache = {};
    };

    svc.isAsset = function (path) {
        let extension = Path.getFileExtension(path).toLowerCase();
        return svc._assetExtensions.indexOf(extension) >= 0;
    };

    svc.getAssetContainer = function (path) {
        let extension = Path.getFileExtension(path).toLowerCase();

        switch (extension) {
            // text related files
            case ".json":
            case ".txt":
                // TODO: add proper container here..
                return null;

            // image files
            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".gif":
            case ".bmp":
            case ".svg":
            case ".ico":
                return new ImageAssetContainer({path: path});

            // default
            default:
                // TODO: add default file container here..
                return null;
        }
    };

    svc.loadAsset = function (path, forceReload) {
        // already in cache?
        if (svc._assetCache[path] && !forceReload) {
            return $q.resolve(svc._assetCache[path]);
        }

        let defer = $q.defer();

        NativeInterface.readFile(path, function (data) {
            if (!data) {
                defer.reject();
                return;
            }

            let asset = Objectify.restoreFromString(data);

            if (!asset) {
                defer.reject();
                return;
            }

            svc._assetCache[path] = asset;

            // finally resolve the loaded asset:
            defer.resolve(asset);
        });

        return defer.promise;
    };

    svc.saveAsset = function (path, asset) {
        let defer = $q.defer();
        let dataString = Objectify.createDataString(asset);

        NativeInterface.writeFile(path, dataString, function (success) {
            return success ? defer.resolve() : defer.reject();
        });

        return defer.promise;
    };

    svc.createTextureAtlas = function () {
        return new TextureAtlas();
    };

    return svc;

});