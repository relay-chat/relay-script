const assertString = (input: any) =>
  typeof input === "string" || input instanceof String;

const hexcolor = /^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;

// shamelessly taken from validatorjs
export default function isHexColor(str: any) {
  assertString(str);
  return hexcolor.test(str);
}
