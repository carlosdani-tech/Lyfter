const fs = require("fs");

fs.readFile("./words1.txt", "utf8", function (firstError, firstData) {
  if (firstError) {
    console.error("Error reading the first file:", firstError);
    return;
  }

  fs.readFile("./words2.txt", "utf8", function (secondError, secondData) {
    if (secondError) {
      console.error("Error reading the second file:", secondError);
      return;
    }

    const firstWords = firstData
      .split("\n")
      .map(function (word) {
        return word.trim();
      })
      .filter(function (word) {
        return word !== "";
      });

    const secondWords = secondData
      .split("\n")
      .map(function (word) {
        return word.trim();
      })
      .filter(function (word) {
        return word !== "";
      });

    const repeatedWords = firstWords.filter(function (word) {
      return secondWords.includes(word);
    });

    if (repeatedWords.length === 0) {
      console.log("There are no repeated words.");
      return;
    }

    console.log(
      `The repeated words are: ${repeatedWords.join(", ")}`
    );
  });
});