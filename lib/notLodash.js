const mapValues = require('lodash.mapvalues');

const cloneDeep = obj => JSON.parse(JSON.stringify(obj));
const get = (obj, path, defaultValue = undefined) => {
  const travel = regexp =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};
const keys = obj => Object.keys(obj);
const set = (obj, path, value) => {
  if (Object(obj) !== obj) return obj;
  if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
  path
    .slice(0, -1)
    .reduce(
      (a, c, i) =>
        Object(a[c]) === a[c]
          ? a[c]
          : (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {}),
      obj
    )[path[path.length - 1]] = value;
  return obj;
};
const toPairs = obj => Object.entries(obj);
const uniq = array => [...new Set(array)];
const values = obj => Object.values(obj);

module.exports = {
  cloneDeep,
  get,
  keys,
  mapValues,
  set,
  toPairs,
  uniq,
  values,
};
