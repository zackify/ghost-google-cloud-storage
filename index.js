'use strict';

var storage     = require('@google-cloud/storage'),
    BaseStore   = require('ghost-storage-base'),
    Promise     = require('bluebird'),
    options     = {};

class GStore extends BaseStore {
    constructor(config = {}){
        super(config);
        options = config;

        var gcs = storage({
            projectId: options.projectId,
            keyFilename: options.key
        });
        this.bucket = gcs.bucket(options.bucket);
        this.assetDomain = options.assetDomain || `${options.bucket}.storage.googleapis.com`;
        // only set insecure from config if assetDomain is set
        if(options.hasOwnProperty('assetDomain')){
            this.insecure = options.insecure;
        }
        // default max-age is 3600 for GCS, override to something more useful
        this.maxAge = options.maxAge || 2678400;
    }

    save(image) {
        var _self = this;
        if (!options) return Promise.reject('google cloud storage is not configured');

        var targetDir = _self.getTargetDir(),
        googleStoragePath = `http${this.insecure?'':'s'}://${this.assetDomain}/`,
        targetFilename;

        return new Promise(function(resolve, reject) {
            _self.getUniqueFileName(image, targetDir).then(function (filename) {
                targetFilename = filename;
                var opts = {
                    destination: targetDir + targetFilename,
                    metadata: {
                        cacheControl: `public, max-age=${this.maxAge}`
                    },
                    public: true
                };
                return _self.bucket.upload(image.path, opts);
            }).then(function (data) {
                return resolve(googleStoragePath + targetDir + targetFilename);
            }).catch(function (e) {
                return reject(e);
            });
        });
    }

    // middleware for serving the files
    serve() {
        // a no-op, these are absolute URLs
        return function (req, res, next) { next(); };
    }

    exists (filename) {
        var _self = this;
        return new Promise(function(resolve, reject){
            _self.bucket.file(filename).exists().then(function(data){
                return resolve(data[0]);
            });
        });
    }

    read (filename) {
      var rs = this.bucket.file(filename).createReadStream(), contents = '';
      return new Promise(function (resolve, reject) {
        rs.on('error', function(err){
          return reject(err);
        });
        rs.on('data', function(data){
          contents += data;
        });
        rs.on('end', function(){
          return resolve(content);
        });
      });
    }

    delete (filename) {
        return this.bucket.file(filename).delete();
    }
}

module.exports = GStore;
