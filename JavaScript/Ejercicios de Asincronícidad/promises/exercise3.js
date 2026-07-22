function createWordPromise(word, delay) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(word);
    }, delay);
  });
}

Promise.all([
  createWordPromise("Dogs", 800),
  createWordPromise("are", 200),
  createWordPromise("very", 600),
  createWordPromise("cute", 100)
])
  .then(function (words) {
    console.log(words.join(" "));
  })
  .catch(function (error) {
    console.error(error.message);
  });