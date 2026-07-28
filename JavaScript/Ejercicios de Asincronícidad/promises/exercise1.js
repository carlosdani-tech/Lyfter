const pokemonIds = [1, 4, 7];

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

const pokemonPromises = pokemonIds.map(function (id) {
  return getPokemon(id);
});

Promise.all(pokemonPromises)
  .then(function (pokemonList) {
    console.log("All Pokémon were obtained:");

    pokemonList.forEach(function (pokemon) {
      console.log(pokemon.name);
    });
  })
  .catch(function (error) {
    console.error("Error:", error.message);
  });