/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const FtpClient = require('ftp');
//var streams = require('memory-streams');
//const path = require('path');

function getFileList(directory) {
  return new Promise((resolve, reject) => {
    const ftpClient = new FtpClient();
    ftpClient.on('ready', function () {
      ftpClient.cwd(directory, function (error, workigDirectory) {
        if (error) reject(error);
        ftpClient.list(function (err, list) {
          if (err) reject(err);
          resolve(list);
          ftpClient.end();
        });
      });
    });
    // connect to localhost:21 as anonymous
    ftpClient.connect();
  });
}

exports.process = async function fetchFileList(msg, cfg) {
  const fileList = await getFileList(cfg.path);

  fileList.forEach(async (file) => {
    this.logger.info('FILE: ', file.name);
    await this.emit('data', messages.newMessageWithBody({ path: cfg.path, name: file.name, lastModified: file.lastModified, attachmentUrl: "" }));
  });

};

// this.logger.info('Emit for: ', file.name);
// await this.emit('data', messages.newMessageWithBody({ path: cfg.path, name: file.name, lastModified: file.lastModified, attachmentUrl }));

/**
 * getStatusModel is supplied in component.json as the model for credential statuses
 * The results of this function will dynamicaly provide the statuses from the API
 * to be displayd on the platform
 */
exports.getStatusModel = async function getStatusModel() {
  const statuses = [];

  return statuses;
};
