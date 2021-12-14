/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const FtpClient = require('ftp');
//var streams = require('memory-streams');
//const paths = require('path');
const ftpClient = new FtpClient();

function getFileList({ path, host, user, pass }) {
  return new Promise((resolve, reject) => {
    // Prepare the FTP Client

    // Handler that will be fired when the FTP client is ready
    ftpClient.on('ready', function () {

      // Change FTP Directory --> To path
      ftpClient.cwd(path, function (error) {
        if (error) reject(error);

        // List files in the current working directory
        ftpClient.list(function (err, list) {
          if (err) reject(err);

          // Return the list of files
          resolve(list);
        });
      });
    });
    ftpClient.connect({ host, user, password: pass });
  });
}

function attachFile(file) {
  return new Promise((resolve, reject) => {
    ftpClient.get(file, async (err, stream) => {
      if (err) reject(err);
      try {
        const attachmentProcessor = new AttachmentProcessor();
        const uploadResult = await attachmentProcessor.uploadAttachment(stream);
        resolve(uploadResult.config.url);
      } catch (error) {
        reject(error);
      }
    });
  });
}

exports.process = async function fetchFileList(msg, cfg) {
  let fileList;
  try {
    fileList = await getFileList(cfg);
  } catch (error) {
    this.logger.info('ERROR (fetchFileList): ', error);
  }

  this.logger.info('Files found: ', fileList.length);


  fileList.forEach(async (file) => {
    this.logger.info('FILE: ', JSON.stringify(file));

    let attachmentUrl;

    try {
      attachmentUrl = await attachFile(file.name);
      this.logger.info('AttachmentURL: ', attachmentUrl);
    } catch (error) {
      await this.emit("error", error);
    }

    await this.emit('data', messages.newMessageWithBody({
      path: cfg.path,
      name: file.name,
      lastModified: file.date,
      attachmentUrl: attachmentUrl
    }));
  });
  ftpClient.end();
};

// this.logger.info('Emit for: ', file.name);
// await this.emit('data', messages.newMessageWithBody({ 
//path: cfg.path, name: file.name, lastModified: file.lastModified, attachmentUrl }));

/**
 * getStatusModel is supplied in component.json as the model for credential statuses
 * The results of this function will dynamicaly provide the statuses from the API
 * to be displayd on the platform
 */
exports.getStatusModel = async function getStatusModel() {
  const statuses = [];

  return statuses;
};
