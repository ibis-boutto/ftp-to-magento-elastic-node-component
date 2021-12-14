/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const FtpClient = require('ftp');
const { Readable } = require('stream');
//var streams = require('memory-streams');
//const paths = require('path');


function getFileList({ path, host, user, pass }) {
  return new Promise((resolve, reject) => {
    // Prepare the FTP Client
    const ftpClient = new FtpClient();

    // Handler that will be fired when the FTP client is ready
    ftpClient.on('ready', function () {

      // Change FTP Directory --> To path
      ftpClient.cwd(path, function (error) {
        if (error) reject(error);

        // List files in the current working directory
        ftpClient.list(function (err, list) {
          if (err) reject(err);
          ftpClient.end();
          // Return the list of files
          resolve(list);
        });
      });
    });
    ftpClient.connect({ host, user, password: pass });
  });
}

/*function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
  });
}*/

function getReadStream(stream) {
  const chunks = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const readStream = new Readable();
      readStream.push(buffer);
      readStream.push(null);
      resolve(readStream);
    })
  });
}

function attachFile(source, file, { path, host, user, pass }) {
  const ftpClient = new FtpClient();
  return new Promise((resolve, reject) => {
    ftpClient.on('ready', function () {
      ftpClient.cwd(path, function (error) {
        if (error) reject(error);
        ftpClient.get(file, async (err, stream) => {
          if (err) reject(err);
          try {
            const attachmentProcessor = new AttachmentProcessor();
            const readStream = await getReadStream(stream);
            const uploadResult = await attachmentProcessor.uploadAttachment(readStream);
            resolve(uploadResult.config.url);
          } catch (attachError) {
            reject(attachError);
          }
          ftpClient.end();
        });
      });
    });

    ftpClient.connect({ host, user, password: pass });
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
      attachmentUrl = await attachFile(this, file.name, cfg);
      this.logger.info('AttachmentURL: ', attachmentUrl);
    } catch (error) {
      await this.emit("error", error);
    }

    await this.emit('data', messages.newMessageWithBody({
      path: cfg.path,
      name: file.name,
      lastModified: file.date,
      size: file.size,
      attachmentUrl: attachmentUrl
    }));
  });
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
