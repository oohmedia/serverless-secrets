const { cloneDeep } = require('../lib/notLodash');
let secrets;

const mockGetSecret = jest.fn();
const mockReadFileSync = jest.fn();
mockReadFileSync.mockImplementation(() => JSON.stringify(secrets));

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
}));

jest.mock('../lib/providers/aws', () => () => ({
  getSecret: mockGetSecret,
}));

const client = require('./index');

let processEnvClone;

const defaultSecrets = {
  options: {
    provider: 'aws',
    throwOnMissingSecret: true,
    logOnMissingSecret: false,
    skipValidation: false,
  },
  environments: {
    $global: {},
    testFunction: {},
  },
};

describe('client', () => {
  beforeAll(() => {
    // eslint-disable-next-line
    process.env._HANDLER = 'asdf.asdf';
    processEnvClone = cloneDeep(process.env);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    secrets = cloneDeep(defaultSecrets);
    mockReadFileSync.mockImplementation(() => JSON.stringify(secrets));
  });

  afterEach(() => {
    process.env = processEnvClone;
  });

  it('happy path', async () => {
    secrets.environments.$global.test_variable = 'test_parameter';
    mockGetSecret.mockImplementation(() => Promise.resolve({ test_parameter: 'test_secret' }));

    expect(process.env.test_variable).toBeUndefined();
    await client.load();
    expect(mockGetSecret).toHaveBeenCalledWith(['test_parameter']);
    expect(process.env.test_variable).toEqual('test_secret');
  });
});
