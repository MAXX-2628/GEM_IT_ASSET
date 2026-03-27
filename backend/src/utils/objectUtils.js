/**
 * Flattens a nested object into a single-level object with dot-notation keys.
 * Example: { a: { b: 1 }, c: 2 } -> { 'a.b': 1, 'c': 2 }
 * 
 * @param {Object} obj The object to flatten
 * @param {string} prefix Key prefix for recursion
 * @returns {Object} Flattened object
 */
const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (
            typeof obj[key] === 'object' &&
            obj[key] !== null &&
            !Array.isArray(obj[key]) &&
            !(obj[key] instanceof Date)
        ) {
            Object.assign(acc, flattenObject(obj[key], pre + key));
        } else {
            acc[pre + key] = obj[key];
        }
        return acc;
    }, {});
};

module.exports = { flattenObject };
