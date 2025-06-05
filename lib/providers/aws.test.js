const nock = require('nock');

const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
const { getSecret, setSecret } = require('./aws')({ region });

describe('AWS Provider', () => {
  const mockSSM = nock(`https://ssm.${region}.amazonaws.com`, {
    encodedQueryParams: true,
  });

  describe('getSecret', () => {
    beforeEach(() => nock.cleanAll());

    const buildParam = (name, value) => ({
      ARN: `arn:aws:ssm:${region}:123456789012:parameter/${name}`,
      LastModifiedDate: 1571697737.801,
      Name: name,
      Type: 'SecureString',
      Value: value,
      Version: 1,
    });

    it('gets a single parameter', async () => {
      const parameterName = 'test_parameter';
      const parameterValue = 'test_value';

      mockSSM.post('/', { Names: [parameterName], WithDecryption: true }).reply(200, {
        InvalidParameters: [],
        Parameters: [buildParam(parameterName, parameterValue)],
      });

      const response = await getSecret(parameterName);
      expect(response).toEqual({ [parameterName]: parameterValue });
    });

    it('gets multiple parameters', async () => {
      mockSSM
        .post('/', { Names: ['test_parameter', 'test_parameter_2'], WithDecryption: true })
        .reply(200, {
          InvalidParameters: [],
          Parameters: [buildParam('test_parameter', '1'), buildParam('test_parameter_2', 'two')],
        });

      const response = await getSecret(['test_parameter', 'test_parameter_2']);
      expect(response).toEqual({ test_parameter: '1', test_parameter_2: 'two' });
    });

    it('rejects on invalid parameters', () => {
      mockSSM
        .post('/', { Names: ['non_existent_param'], WithDecryption: true })
        .reply(200, { InvalidParameters: ['non_existent_param'], Parameters: [] });

      expect.assertions(1);
      return getSecret('non_existent_param').catch(e =>
        expect(e).toEqual(new Error('Invalid parameters'))
      );
    });
  });

  describe('setSecret', () => {
    it('sets a param with defaults', async () => {
      mockSSM
        .post('/', {
          Name: 'Test Name',
          Value: 'Test Value',
          Description: 'Created with Serverless Secrets',
          Type: 'SecureString',
          Overwrite: true,
        })
        .reply(200, { InvalidParameters: [], Parameters: ['foo'] });

      const result = await setSecret('Test Name', 'Test Value');
      expect(result).toEqual({
        $metadata: expect.any(Object),
        InvalidParameters: [],
        Parameters: ['foo'],
      });
    });

    it('sets a param with overrides', async () => {
      mockSSM
        .post('/', {
          Name: 'Test Name 2',
          Value: 'Test Value 2',
          Description: 'randomDescription',
          Type: 'String',
          Overwrite: true,
          KeyId: 'keyid',
        })
        .reply(200, { InvalidParameters: [], Parameters: ['foo'] });

      const result = await setSecret(
        'Test Name 2',
        'Test Value 2',
        'randomDescription',
        false,
        'keyid'
      );
      expect(result).toEqual({
        $metadata: expect.any(Object),
        InvalidParameters: [],
        Parameters: ['foo'],
      });
    });
  });
});
