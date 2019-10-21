'use strict'

const AWS = require('aws-sdk')

const defaultOptions = {
  apiVersion: '2014-11-06',
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
}

module.exports = function (options) {
  const ssm = new AWS.SSM(Object.assign({}, defaultOptions, options))

  function getSecret (parameterNames) {
    const names = Array.isArray(parameterNames) ? parameterNames : [parameterNames]
    const params = {
      Names: names,
      WithDecryption: true
    }

    return ssm.getParameters(params).promise().then(data => {
      return data.Parameters.reduce((obj, x) => {
        obj[x.Name] = x.Value
        return obj
      }, {})
    })
  }

  function setSecret (name, value, description = 'Created with Serverless Secrets', isEncrypted = true, keyId) {
    const params = {
      Name: name,
      Value: value,
      Description: description,
      Type: isEncrypted ? 'SecureString' : 'String',
      Overwrite: true
    }

    if (keyId) params.KeyId = keyId

    return ssm.putParameter(params).promise()
  }

  function deleteSecret (name) {
    return ssm.deleteParameter({
      Name: name
    }).promise()
  }

  function getSecrets(options) {
    return new Promise((resolve, reject) => {
      const secrets = [];
      ssm.getParametersByPath(options).promise()
        .then(params => {
          if (params.NextToken) {
            getSecrets(Object.assign({}, options, { NextToken: params.NextToken }))
            .then(nextParams => {
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
  }

  function listSecrets(rootPaths = []) {
    return new Promise((resolve, reject) => {
      const secretKeys = [];
      const mapParam = param => ({ name: param.Name });

      const promises = rootPaths.map(path =>
        getSecrets({ Path: path, Recursive: true })
      );

      Promise.all(promises).then(paths => {
        paths.map(path => path.forEach(key => secretKeys.push(mapParam(key))));
        resolve(secretKeys);
      });
    });
  }

  return {
    getSecret,
    setSecret,
    deleteSecret,
    listSecrets
  }
}
