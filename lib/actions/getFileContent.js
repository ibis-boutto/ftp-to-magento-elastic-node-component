/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const paths = require("path");
const http = require("http");

// Gets SKU from the file name
function getSku(fileName) {

  // The SKU is a secuence is the first secuence of digits
  const sku = fileName.match(/\d+/);

  // In case there are no digits, throws an error.
  if (sku === null) throw new Error(`${fileName} doest not have an SKU.`);

  return sku.toString();
}

// Gets MIMEType from file name and extension
function getMimeType(fileName) {

  const extension = paths.extname(fileName);

  // Throws an error if the file has no extension
  if (extension === '') throw new Error(`${fileName} has no valid extension. `);

  // Defines a list of allowed extensions
  const allowedExtensions = ['.jpeg', '.jpg', '.png'];

  // Checks if the current file extension is allowed
  if (!allowedExtensions.includes(extension)) {

    // Throws an error in case the extension is not allowed or compatible.
    throw new Error(`File [${fileName}] could not be processed. Incompatible Mime type.`);
  }

  // Returns the MIME Type
  // replaces JPG by JPEG to match the Mime Standard
  return `image/${extension.replace('jpg', 'jpeg').replace(".", "")}`;
}

// Gets a valid name
function getValidName(fileName) {

  // Gets the file extension
  const extension = paths.extname(fileName);

  // Removes the extension, Removes special characters, and then adds the extension at the end
  return paths.basename(fileName)
    .replace(extension, "")
    .replace(/[^a-zA-Z0-9_]/g, '').concat(extension);
}

// Gets file content using HTTP client to read the attached file
function getFileConent(source, file) {
  return new Promise((resolve, reject) => {
    http.get(file, (res) => {
      source.logger.info('GET: ' + file);

      const { statusCode } = res;
      let error;

      // Checks if the Status fo the request is 200 (OK)
      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' +
          `Status Code: ${statusCode}`);
      }

      if (error) {
        // Consume response data to free up memory
        res.resume();
        return;
      }

      // Sets the enconding to be base64
      res.setEncoding('base64');

      // Variable to hold the data coming from the request response
      let rawData = '';

      // On new data arrival, adds it to the previous
      res.on('data', (chunk) => { rawData += chunk; });

      // When data transfer is complete
      res.on('end', () => {

        // Returns the encoded data
        resolve(rawData);
      });
    }).on('error', (e) => {

      // In case of error, rejects the promise
      reject(e);
    });
  });
}

// Main function of the Action
exports.process = async function process(msg) {

  this.logger.info('Processing file to get content: ', msg.body.name);

  // Extracts name and attachment URL from the message sent  by the previous step of the flow
  const { name, attachmentUrl } = msg.body;

  this.logger.info('Processing file to get content: ', name);

  // Gets the SKU
  const sku = getSku(name);

  // Gets the MIMEType
  const mimeType = getMimeType(name);

  let base64FileContent;

  try {

    // Gets the content of the file in base64 encoding from the attachment.
    base64FileContent = await getFileConent(this, attachmentUrl);
    this.logger.info('Base64 Content was fetched for file: ', name);
  } catch (err) {
    throw new Error("Could not read file content for file: " + name + ". ERROR: " + err)
  }
  this.logger.info('File was processed: ', name);

  // Emits the new message to the flow.
  await this.emit('data', messages.newMessageWithBody({
    originalName: name,
    name: getValidName(name),
    mimeType,
    sku,
    content: base64FileContent,
  }));

};
