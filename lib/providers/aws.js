// eslint-disable-next-line import/no-extraneous-dependencies
import {
  SSMClient,
  GetParametersCommand,
  PutParameterCommand,
  DeleteParametersCommand,
  GetParametersByPathCommand,
} from '@aws-sdk/client-ssm';

const defaultOptions = {
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
};

module.exports = clientOptions => {
  const ssmClient = new SSMClient({ ...defaultOptions, ...clientOptions });

  const getSecret = async parameterNames => {
    const names = Array.isArray(parameterNames) ? parameterNames : [parameterNames];
    const params = {
      Names: names,
      WithDecryption: true,
    };

    const command = new GetParametersCommand(params);
    const data = await ssmClient.send(command);

    if (data.InvalidParameters && data.InvalidParameters.length) {
      throw new Error('Invalid parameters');
    }

    return data.Parameters.reduce((obj, p) => ({ ...obj, [p.Name]: p.Value }), {});
  };

  const setSecret = async (
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

    const command = new PutParameterCommand(params);
    const response = await ssmClient.send(command);

    return response;
  };

  const deleteSecret = async name => {
    const names = Array.isArray(name) ? name : [name];
    const input = {
      Names: names,
    };
    const command = new DeleteParametersCommand(input);
    const response = await ssmClient.send(command);

    return response;
  };

  const getSecrets = async options => {
    const secrets = [];
    const command = new GetParametersByPathCommand(options);
    const params = await ssmClient.send(command);
    if (params.NextToken) {
      const nextParams = await getSecrets({ ...options, NextToken: params.NextToken });
      params.Parameters.forEach(p => secrets.push(p));
      nextParams.forEach(p => secrets.push(p));
    } else {
      params.Parameters.map(p => secrets.push(p));
    }

    return secrets;
  };

  const listSecrets = (rootPaths = []) =>
    new Promise(resolve => {
      const secretKeys = [];
      const mapParam = param => ({ name: param.Name });

      const promises = rootPaths.map(async path => getSecrets({ Path: path, Recursive: true }));

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
