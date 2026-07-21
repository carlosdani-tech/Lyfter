function getPokemon(id) {
  const url = `https://pokeapi.co/api/v2/pokemon/${id}`;

  return fetch(url).then(function (response) {
    if (!response.ok) {
      throw new Error(
        `Could not get Pokémon ${id}. Status: ${response.status}`
      );
    }

    return response.json();
  });
}

const firstPokemonPromise = getPokemon(1);
const secondPokemonPromise = getPokemon(4);
const thirdPokemonPromise = getPokemon(7);

Promise.any([
  firstPokemonPromise,
  secondPokemonPromise,
  thirdPokemonPromise
])
  .then(function (pokemon) {
    console.log(
      `The first resolved Pokémon is: ${pokemon.name}`
    );
  })
  .catch(function (error) {
    console.error(
      "None of the Pokémon requests were successful.",
      error
    );
  });