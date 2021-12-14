/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const fs = require("fs");
const paths = require('path');


/*function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
  });
}*/

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

function getFileConent(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'base64', function (err, fileContent) {
      if (err) reject(err)
      // Display the file content
      resolve(fileContent);
    });
  });
}

exports.process = async function process(msg, cfg) {

  this.logger.info('Processing file to get content: ', msg.body.name, JSON.stringify(cfg));

  const { name, path, attachmentUrl } = msg.body;

  this.logger.info('Processing file to get content: ', name);

  const sku = getSku(name);

  const mimeType = getMimeType(name);

  let base64FileContent;

  this.logger.info('SUMMARY: ', "Name: " + name + ", Path: " + path + ", SKU: " + sku + ", MIME: " + mimeType);

  try {
    base64FileContent = await getFileConent(attachmentUrl);
    this.logger.info('Base64 Content was fetched.: ', name);
  } catch (err) {
    throw new Error("Could not read file content for file: " + name + ". ERROR: " + err)
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
