module.exports = (value) => {
  if (Buffer.isBuffer(value)) {
    return value.length === 1 && value[0] === 1;
  }
  return value === true || value === 1 || value === '1';
};
