/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const Ftp = require('ftp');
const paths = require('path');

const ftpClient = new Ftp();

function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
  });
}

function getSku(fileName) {
  const sku = fileName.match(/\d+/);

  if (sku === null) throw new Error(`${fileName} doest not have an SKU.`);

  return sku.toString();
}

function getMimeType(fileName) {
  const extension = paths.extname(fileName);

  if (extension === '') throw new Error(`${fileName} has no valid extension. `);

  const allowedExtensions = ['.jpeg', '.jpg', '.png'];

  if (!allowedExtensions.includes(extension)) {
    throw new Error(`File [${fileName}] could not be processed. Incompatible Mime type.`);
  }

  return `image/${extension.replace('jpg', 'jpeg').replace(".", "")}`;
}

function getValidName(fileName) {
  const extension = paths.extname(fileName);
  return paths.basename(fileName)
    .replace(extension, "")
    .replace(/[^a-zA-Z0-9_]/g, '').concat(extension);
}

function getFileConent(fullPath, { host, user, pass }) {
  return new Promise((resolve, reject) => {
    ftpClient.on('ready', () => {
      ftpClient.get(fullPath, async (err, stream) => {
        if (err) reject(err);

        stream.once('close', () => { ftpClient.end(); });

        try {
          resolve(await streamToString(stream));
        } catch (error) {
          reject(error);
        }
      });
    });

    ftpClient.connect({
      host,
      user,
      password: pass
    });
  });
}

exports.process = async function process(msg, cfg) {

  this.logger.info('Processing file to get content: ', msg.body.name + cfg);

  const { name, path } = msg.body;

  this.logger.info('Processing file to get content: ', name);

  const sku = getSku(name);

  const mimeType = getMimeType(name);

  let base64FileContent;

  const fullPath = `./${path}/${name}`;

  this.logger.info('SUMMARY: ', "Name: " + name + ", Path: " + path + ", SKU: " + sku + ", MIME: " + mimeType + ", Full Path: " + fullPath);

  try {
    base64FileContent = await getFileConent(fullPath, cfg);
    this.logger.info('Base64 Content was fetched.: ', name);
  } catch (err) {
    throw new Error("Could not read file content for file: " + name)
  }
  this.logger.info('File was processed: ', name);
  await this.emit('data', messages.newMessageWithBody({
    originalName: name,
    name: getValidName(name),
    mimeType,
    sku,
    content: base64FileContent,
  }));

};
