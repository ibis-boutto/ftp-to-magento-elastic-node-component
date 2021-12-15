const { messages } = require('elasticio-node');
const ftp = require("basic-ftp")
const paths = require("path");

let ftpConnectionSettings;

async function getFtpClient() {
    const ftpClient = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await ftpClient.connect(ftpConnectionSettings);
        await client.send("CLNT FileZilla");
        await client.send("OPTS UTF8 ON");
        await client.send("PBSZ 0");
        await client.send("PROT P");
    }
    catch (error) {
        throw new Error("Could not stablished FTP connection.");
    }
    return ftpClient;
}

async function moveFile(sourcePath, targetPath) {
    try {
        const ftpClient = getFtpClient();
        await client.send("RNFR /" + sourcePath);
        const moveResult = await client.send("RNTO /" + targetPath);
        if (moveResult.code === 250) {
            return { source: sourcePath, target: targetPath, status: "Success" }
        }

    } catch (error) {
        throw new Error("Could not move file.");
    }

    return { source: sourcePath, target: targetPath, status: "Failed" }
}


// Main function of the Action
exports.process = async function process(msg, cfg) {

    // Extract credentials
    const { host, user, pass }

    // Apply Credentials
    ftpConnectionSettings = { host, user, password: pass }

    // Defines the source path/file
    const source = paths.join(msg.body.sourcePath, msg.body.fileName);

    // Defines the target path/file
    const target = paths.join(msg.body.targetPath, msg.body.newFileName);

    // Moves the file
    const moveResult = await moveFile(source, target);

    // Emits the result
    await this.emit('data', messages.newMessageWithBody(moveResult));

}