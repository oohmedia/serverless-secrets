const fs = require('fs');
const path = require('path');
const { mapValues, uniq, values, keys } = require('../lib/notLodash');
const constants = require('../lib/constants');
const awsProvider = require('../lib/providers/aws');

let secrets = null;

function getStorageProvider(options) {
  switch (options.provider) {
    case 'aws':
      return awsProvider(options.providerOptions || {});
    default:
      throw new Error(`Provider not supported: ${options.provider}`);
  }
}

function loadConfig() {
  const configPath = path.join(process.cwd(), constants.CONFIG_FILE_NAME);
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function init(config) {
  if (!secrets) {
    secrets = config || loadConfig();
  }
}

function load(options) {
  init();
  const mergedOptions = { ...secrets.options, ...options };
  const environmentSecrets = {
    ...secrets.environments.$global,
    // eslint-disable-next-line
    ...secrets.environments[process.env._HANDLER.split('.')[1]],
  };
  const parameterNames = uniq(values(environmentSecrets));
  const provider = getStorageProvider(mergedOptions);
  return provider.getSecret(parameterNames).then(data => {
    const missingParameters = parameterNames.filter(
      expected => !keys(data).some(received => expected === received)
    );
    Object.assign(
      process.env,
      mapValues(environmentSecrets, key => data[key])
    );
    if (missingParameters.length) {
      const message = `Secrets could not be obtained for the following environment variables: ${missingParameters.join(
        ', '
      )}`;
      if (mergedOptions.logOnMissingSecret) console.log(message);
      if (mergedOptions.throwOnMissingSecret) throw new Error(message);
    }
  });
}

function loadByName(envVarName, parameterName, options) {
  init();
  const mergedOptions = { ...secrets.options, ...options };
  const provider = getStorageProvider(mergedOptions);
  return provider.getSecret(parameterName).then(data => {
    if (data[parameterName]) {
      process.env[envVarName] = data[parameterName];
    } else {
      const message = `Secret could not be obtained for environment variable: ${envVarName}`;
      if (mergedOptions.logOnMissingSecret) console.log(message);
      if (mergedOptions.throwOnMissingSecret) throw new Error(message);
    }
  });
}

module.exports = {
  init,
  load,
  loadByName,
};
