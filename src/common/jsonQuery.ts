const matchingXPath = new RegExp('(\\[|\\.|\\]){1,}', 'g');

/**
 * tests if a given string could be an xpath (with accessors)
 * @param key
 */
export function isXPath(key: string) {
  return matchingXPath.test(key);
}

/**
 * @param object object or array of objects to search in by xPath
 * @param xPath example: "[key=businessUnitCode].value"
 * @param options
 */
export function queryByXPath(
  object: unknown | Array<unknown>,
  xPath: string,
  options?: { searchInArrayElements?: 'ALL' | 'FIRST' }
): unknown | Array<unknown> {
  if (Array.isArray(object) && options?.searchInArrayElements) {
    return options?.searchInArrayElements === 'ALL'
      ? object?.map(o => queryByXPath(o, xPath))?.filter(x => !!x)
      : queryByXPath(
          object?.find(o => queryByXPath(o, xPath)),
          xPath
        );
  }
  return xPath
    .replace('[', '.[')
    .split('.')
    ?.reduce((input, acc) => {
      const accessor = acc.trim();
      if (/^\[.*=.*\]$/.test(accessor)) {
        const [k, v] = accessor
          .replace(/(\[|\])/gi, '')
          .split('=')
          .map(i => i.trim());
        if (Array.isArray(input)) {
          return options?.searchInArrayElements === 'ALL' ? input?.filter(i => i?.[k] === v) : input?.find(i => i?.[k] === v);
        }
        if (input?.[k] === v) {
          return input;
        }
      } else {
        if (Array.isArray(input)) {
          if (Number.isFinite(parseInt(accessor, 10))) {
            return input?.[accessor];
          }
          return options?.searchInArrayElements === 'ALL'
            ? input?.map(i => i?.[accessor])
            : input?.filter(i => i?.[accessor])?.[0]?.[accessor];
        }
        return input?.[accessor];
      }
    }, object);
}

/**
 *
 * @param object object or array of objects to extract from
 * @param xPaths array of xPaths to queryBy
 * @example extract(object, ['inputs.number', 'parent', 'outputs.others.2.key', 'outputs.others[key=Y].value'])
 */
export function extract(object, xPaths: Array<string>) {
  return xPaths.map((xp, index) => {
    return { [xPaths[index]]: queryByXPath(object, xPaths[index]) };
  });
}
