/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const ftp = require('basic-ftp');


exports.process = async function fetchFileList(msg, cfg) {
  this.logger.info('APP: ', 'FetchFileList Start');
  let currentFiles = [];

  this.logger.info('APP: ', `Connecting to the FTP Server. Credentials: ${JSON.stringify(cfg)}`);

  const ftpClient = new ftp.Client();

  ftpClient.ftp.verbose = false;

  try {
    await ftpClient.access({
      host: cfg.host,
      user: cfg.user,
      password: cfg.pass,
    });
  } catch (error) {
    throw new Error(error);
  }

  this.logger.info('APP: ', 'Connected');
  this.logger.info('APP: ', `Changing Path to ${cfg.path}`);
  await ftpClient.cd(cfg.path);

  this.logger.info('APP: ', 'Listing files');
  const directoryFileList = await ftpClient.list();

  this.logger.info('Files found in Directory: ', directoryFileList.length);
  currentFiles = directoryFileList.map((file) => ({
    name: file.name,
    lastModified: file.modifiedAt,
  }));

  this.logger.info('APP: ', 'Closing FTP CLient');

  ftpClient.close();

  this.logger.info('currentFiles: ', currentFiles.length);

  // emit result using supplied emit function

  currentFiles.forEach(async (file) => {
    this.logger.info('Emit for: ', file.name);
    //const attachment_url = await getAttachmentUrl(paths.join(cfg.path, file.name))
    await this.emit('data', messages.newMessageWithBody({ path: cfg.path, name: file.name, lastModified: file.lastModified }));
  });

};

/**
 * getStatusModel is supplied in component.json as the model for credential statuses
 * The results of this function will dynamicaly provide the statuses from the API
 * to be displayd on the platform
 */
exports.getStatusModel = async function getStatusModel() {
  const statuses = [];

  return statuses;
};
