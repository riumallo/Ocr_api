exports.extraerRut = (text) => {
  const RUT_REGEX = /(\d{1,3}(?:\.\d{3}){1,2}-[\dkK])/g;
  return text.match(RUT_REGEX) || [];
};
