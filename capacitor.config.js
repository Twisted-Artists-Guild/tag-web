const serverUrl = process.env.CAPACITOR_SERVER_URL;

if (!serverUrl) {
  throw new Error(
    'Native testing requires CAPACITOR_SERVER_URL. Use npm run mobile:android or npm run mobile:ios.'
  );
}

const server = new URL(serverUrl);

if (
  !['http:', 'https:'].includes(server.protocol) ||
  server.username ||
  server.password
) {
  throw new Error('CAPACITOR_SERVER_URL must be an HTTP(S) URL without credentials.');
}

const config = {
  appId: 'com.twistedartistsguild.app',
  appName: 'Twisted Artists Guild',
  webDir: 'public',
  server: {
    url: server.href,
    cleartext: server.protocol === 'http:'
  }
};

module.exports = config;
