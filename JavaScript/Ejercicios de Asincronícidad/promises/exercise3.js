function createWordPromise(word, position, delay) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({
        word: word,
        position: position
      });
    }, delay);
  });
}

const promises = [
  createWordPromise("very", 2, 800),
  createWordPromise("dogs", 0, 300),
  createWordPromise("cute", 3, 600),
  createWordPromise("are", 1, 100)
];

Promise.all(promises)
  .then(function (results) {
    results.sort(function (firstItem, secondItem) {
      return firstItem.position - secondItem.position;
    });

    const sentence = results
      .map(function (item) {
        return item.word;
      })
      .join(" ");

    const formattedSentence =
      sentence.charAt(0).toUpperCase() + sentence.slice(1);

    console.log(formattedSentence);
  })
  .catch(function (error) {
    console.error("Error:", error.message);
  });