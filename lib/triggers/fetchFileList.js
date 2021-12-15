/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
const { messages } = require('elasticio-node');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const FtpClient = require('ftp');
const { Readable } = require('stream');

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

// Generates a new stram with the content of the file
function getReadStream(stream) {
  const chunks = [];

  return new Promise((resolve, reject) => {
    // When the stream receives data as a chunk, it adds it to the buffer
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

    // Reject the poromise on error
    stream.on('error', (err) => reject(err));

    // After reading the stream
    stream.on('end', () => {

      // Concatenates the chunks into a buffer
      const buffer = Buffer.concat(chunks);

      // instantiates a new readable stram
      const readStream = new Readable();

      // Pushes the buffer into the readable stream
      readStream.push(buffer);

      // Push NULL to set the boundary of the stream
      readStream.push(null);

      // Returns the readable stream
      resolve(readStream);
    })
  });
}

// Generates a new attachment based on the input file
function attachFile(file, { path, host, user, pass }) {
  // Prapare the FTP Client
  const ftpClient = new FtpClient();

  // Process the file
  return new Promise((resolve, reject) => {

    // Execute when the FTP client is ready
    ftpClient.on('ready', function () {

      // Changes FTP Working Directory
      ftpClient.cwd(path, function (error) {
        if (error) reject(error);

        // Gets the content of the FTP file into a stream and reads it.
        ftpClient.get(file, async (err, stream) => {
          if (err) reject(err);
          try {
            // Declare Attachment Processor
            const attachmentProcessor = new AttachmentProcessor();

            // Gets a Readable Stream from the received content
            const readStream = await getReadStream(stream);

            // Generates the attachment
            const uploadResult = await attachmentProcessor.uploadAttachment(readStream);

            // Returns the URL of the attachment
            resolve(uploadResult.config.url);
          } catch (attachError) {
            reject(attachError);
          }
          // Closes the FTP Client
          ftpClient.end();
        });
      });
    });

    // Connects to the FTP Server using the credentials
    ftpClient.connect({ host, user, password: pass });
  });
}

// Generates a new file KEY that will be used as identifier for the 
// file in the snapshot
function getFileKey(file) {

  // Generates a tag that corresponds to the file name and the file date joined 
  // by an underscore
  const fileTag = file.name + "_" + file.date;

  // Converts and returns the tag as a base64 key
  return Buffer.from(fileTag).toString("base64");
}

// Checks if a key exists in the Snapshot
function fileKeyExists(file, snapshot) {

  // if the keys fields of the snapshot does not exist, regards the file as inexistent
  if (!snapshot.keys) return false;

  // TRUE if the file KEY exists in the Snapshot
  return snapshot.keys.includes(getFileKey(file));
}

// Initializes the Snapshot
function initializeSnapShot(cfg) {

  // Generates an empty object
  const newSnapShot = {}

  // Initializes the key list as an empty array
  newSnapShot.keys = [];

  // Sets the auto clear property
  newSnapShot.autoClear = cfg.autoClearSnapshot;

  // Sets the auto clear interval
  newSnapShot.autoClearSnapshotInterval = cfg.autoClearSnapshotInterval;

  // Initializes the current snapshot iteration
  newSnapShot.currentIteration = 1;

  // Returns the newly created snapshot
  return newSnapShot;
}

exports.process = async function fetchFileList(msg, cfg, snapshot) {

  // Grabs the Snapshot
  let newSnapShot = snapshot;

  let fileList;
  try {
    // Gets the list of files
    fileList = await getFileList(cfg);
  } catch (error) {
    this.logger.info('ERROR (fetchFileList): ', error);
  }

  this.logger.info('Files found: ', fileList.length);

  // New snapshot conditions
  const isNewSnapshot = !newSnapShot.keys || newSnapShot.length === 0;

  // Must clear snapshot conditions
  const mustClearSnapshot = newSnapShot.autoClear && newSnapShot.currentIteration >=
    newSnapShot.autoClearSnapshotInterval;

  // If the snapshot is empty or must be cleared
  if (isNewSnapshot || mustClearSnapshot) {

    // Initializes the snapshot
    this.logger.info('Reinitializing Snapshot...', fileList.length);
    newSnapShot = initializeSnapShot(cfg);
  }

  // Calculates the number of new and updated files since last scan
  const polledFiles = fileList.filter(file => {
    return !fileKeyExists(file, newSnapShot) ||
      !newSnapShot.keys || newSnapShot.keys.length === 0;
  }).length

  this.logger.info('Snapshot contains ',
    newSnapShot.keys.length + " items and " +
    polledFiles + " will be added. Current iteration: " + newSnapShot.currentIteration + "/" + newSnapShot.autoClearSnapshotInterval);

  // Iterates only on new and updated files
  fileList.filter(file => {
    return !fileKeyExists(file, newSnapShot);
  }).forEach(async (file) => {

    this.logger.info('Generating new key for : ',
      file.name + " :: KEY = " + getFileKey(file));

    // Add File key to the Snapshot
    newSnapShot.keys.push(getFileKey(file));

    let attachmentUrl;

    try {

      // Gets the Attachment URL for the current file
      attachmentUrl = await attachFile(file.name, cfg);
      this.logger.info('AttachmentURL: ', attachmentUrl);
    } catch (error) {
      await this.emit("error", error);
    }

    // Emits the new file to the flow
    await this.emit('data', messages.newMessageWithBody({
      path: cfg.path,
      name: file.name,
      lastModified: file.date,
      size: file.size,
      attachmentUrl: attachmentUrl
    }));
  });

  // Emits the new version of the snapshot
  newSnapShot.currentIteration += 1;
  await this.emit("snapshot", newSnapShot);
  await this.emit("end");
};