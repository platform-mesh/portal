const { resolve } = require('path');
const { existsSync } = require('fs');

module.exports = (path, options) => {
  // If it's a .js import and the corresponding .ts file exists, resolve to .ts
  if (
    path.endsWith('.js') &&
    (path.startsWith('./') || path.startsWith('../'))
  ) {
    const tsPath = path.replace(/\.js$/, '.ts');
    const fullTsPath = resolve(options.basedir, tsPath);
    if (existsSync(fullTsPath)) {
      return options.defaultResolver(tsPath, options);
    }
  }
  // Otherwise, use default resolution
  return options.defaultResolver(path, options);
};
