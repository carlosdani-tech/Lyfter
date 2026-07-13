const example = "This is a string";
const words = [];
let currentWord = "";

for (const character of example) {
  if (character === " ") {
    if (currentWord !== "") {
      words.push(currentWord);
      currentWord = "";
    }
  } else {
    currentWord += character;
  }
}

// Agrega la última palabra, porque el texto no termina con un espacio.
if (currentWord !== "") {
  words.push(currentWord);
}

console.log(words);