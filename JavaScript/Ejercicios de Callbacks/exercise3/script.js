const colors = [
  "red",
  "blue",
  "green",
  "yellow",
  "cyan",
  "pink"
];

const changeColorButton = document.getElementById(
  "change-color-button"
);

const colorParagraph = document.getElementById(
  "color-paragraph"
);

changeColorButton.addEventListener("click", function () {
  const randomIndex = Math.floor(
    Math.random() * colors.length
  );

  const randomColor = colors[randomIndex];

  colorParagraph.style.backgroundColor = randomColor;
});