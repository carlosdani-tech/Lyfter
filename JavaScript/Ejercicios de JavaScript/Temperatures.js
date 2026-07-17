const celsiusTemperatures = [0, 10, 20, 30, 40];

const fahrenheitTemperatures = celsiusTemperatures.map(
  (temperature) => (temperature * 9) / 5 + 32
);

console.log(fahrenheitTemperatures);