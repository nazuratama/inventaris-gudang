export function debounce(callback, delay = 300) {
  let timer = null;

  function debounced(...args) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  }

  debounced.cancel = () => {
    window.clearTimeout(timer);
    timer = null;
  };

  debounced.flush = (...args) => {
    window.clearTimeout(timer);
    timer = null;
    return callback(...args);
  };

  return debounced;
}
