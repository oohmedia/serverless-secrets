// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');

const defaultOptions = {
  apiVersion: '2014-11-06',
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
};

module.exports = clientOptions => {
  const ssm = new AWS.SSM({ ...defaultOptions, ...clientOptions });

  const getSecret = async parameterNames => {
    const names = Array.isArray(parameterNames) ? parameterNames : [parameterNames];
    const params = {
      Names: names,
      WithDecryption: true,
    };

    const data = await ssm.getParameters(params).promise();

    if (data.InvalidParameters && data.InvalidParameters.length) {
      throw new Error('Invalid parameters');
    }

    return data.Parameters.reduce((obj, p) => ({ ...obj, [p.Name]: p.Value }), {});
  };

  const setSecret = (
    name,
    value,
    description = 'Created with Serverless Secrets',
    isEncrypted = true,
    keyId
  ) => {
    const params = {
      Name: name,
      Value: value,
      Description: description,
      Type: isEncrypted ? 'SecureString' : 'String',
      Overwrite: true,
    };

    if (keyId) {
      params.KeyId = keyId;
    }

    return ssm.putParameter(params).promise();
  };

  const deleteSecret = name =>
    ssm
      .deleteParameter({
        Name: name,
      })
      .promise();

  const getSecrets = options =>
    new Promise(resolve => {
      const secrets = [];
      ssm
        .getParametersByPath(options)
        .promise()
        .then(params => {
          if (params.NextToken) {
            getSecrets({ ...options, NextToken: params.NextToken }).then(nextParams => {
              params.Parameters.forEach(p => secrets.push(p));
              nextParams.forEach(p => secrets.push(p));
              resolve(secrets);
            });
          } else {
            params.Parameters.map(p => secrets.push(p));
            resolve(secrets);
          }
        });
    });

  const listSecrets = (rootPaths = []) =>
    new Promise(resolve => {
      const secretKeys = [];
      const mapParam = param => ({ name: param.Name });

      const promises = rootPaths.map(path => getSecrets({ Path: path, Recursive: true }));

      Promise.all(promises).then(paths => {
        paths.map(path => path.forEach(key => secretKeys.push(mapParam(key))));
        resolve(secretKeys);
      });
    });

  return {
    getSecret,
    setSecret,
    deleteSecret,
    listSecrets,
  };
};
