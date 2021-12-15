const { messages } = require('elasticio-node');
const ftp = require("basic-ftp")
const paths = require("path");

let ftpConnectionSettings;

// Generates a ready to use FTP client with the proper credentials
async function getFtpClient() {

    // Creates a new FTP CLient
    const ftpClient = new ftp.Client();

    // Disable verbosing
    ftpClient.ftp.verbose = false;

    try {

        // Establish the FTP Connection
        await ftpClient.connect(ftpConnectionSettings);

        // Sets FTP client as FileZilla
        await ftpClient.send("CLNT FileZilla");

        // Set Options for the FTP Connection
        await ftpClient.send("OPTS UTF8 ON");

        // Sets Buffering
        await ftpClient.send("PBSZ 0");

        // Sets FTP Protocol
        await ftpClient.send("PROT P");
    }
    catch (error) {
        throw new Error("Could not stablished FTP connection.");
    }

    // Returns the ready-to-use FTP Client
    return ftpClient;
}

// Moves a file from sourcePath to targetPath
async function moveFile(th, sourcePath, targetPath) {
    try {

        // Gets a new FTP Client
        const ftpClient = getFtpClient();

        // Change FTP Working Directory
        th.logger.info("Changing Working Directory CWD /" + paths.dirname(sourcePath));
        await ftpClient.send("CWD /" + paths.dirname(sourcePath))

        th.logger.info("Sending copy: RNFR /" + paths.basename(sourcePath))

        // Sends the command for renaming FROM
        const copyResult = await ftpClient.send("RNFR /" + sourcePath);
        th.logger.info("Copy Result: ", JSON.stringify(copyResult))


        // Sends the command for renaming TO/MOVING
        th.logger.info("Sending paste: RNTO /" + targetPath)
        const moveResult = await ftpClient.send("RNTO /" + targetPath);
        th.logger.info("Paste Result: ", JSON.stringify(moveResult))


        // Checks if the returned code is 250 (Sucess)
        if (moveResult.code === 250) {
            return { source: sourcePath, target: targetPath, status: "Success" }
        }

    } catch (error) {
        throw new Error("Could not move file. " + error);
    }

    // Moving failed
    return { source: sourcePath, target: targetPath, status: "Failed" }
}


// Main function of the Action
exports.process = async function process(msg, cfg) {

    // Extract credentials
    const { host, user, pass } = cfg;

    // Apply Credentials
    ftpConnectionSettings = { host, user, password: pass }

    // Defines the source path/file
    const source = paths.join(msg.body.sourcePath, msg.body.fileName);

    // Defines the target path/file
    const target = paths.join(msg.body.targetPath, msg.body.newFileName);

    // Moves the file
    const moveResult = await moveFile(this, source, target);

    // Emits the result
    await this.emit('data', messages.newMessageWithBody(moveResult));

}