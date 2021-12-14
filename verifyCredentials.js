
const ftp = require("basic-ftp")
/**
 * Executes the verification logic by sending a simple to the
 * Petstore API using the provided apiKey.
 * If the request succeeds, we can assume that the apiKey is valid. Otherwise it is not valid.
 *
 * @param credentials object to retrieve apiKey from
 *
 * @returns boolean of whether or not the request was successful
 */
module.exports = async function verify(credentials) {
  const { host, user, pass } = credentials;

  const ftpClient = new ftp.Client(3000);

  const ftpConnectionSettings = {
    host: host,
    user: user,
    password: pass,
    secure: true,
  }

  try {
    await ftpClient.access(ftpConnectionSettings);
    return true;
  } catch (e) {
    return false;
  }
};
