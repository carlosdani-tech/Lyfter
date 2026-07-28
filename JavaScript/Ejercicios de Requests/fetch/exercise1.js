const API_URL = "https://api.restful-api.dev/objects";

async function getAllObjects() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(
        `Error ${response.status}: No se pudieron obtener los objetos.`
      );
    }

    const objects = await response.json();

    const objectsWithData = objects.filter(function (object) {
      return Object.hasOwn(object, "data");
    });

    if (objectsWithData.length === 0) {
      console.log("No se encontraron objetos con la propiedad data.");
      return [];
    }

    console.log("Objetos con data:");

    objectsWithData.forEach(function (object) {
      console.log("--------------------");
      console.log(`ID: ${object.id}`);
      console.log(`Name: ${object.name}`);
      console.log("Data:", object.data);
    });

    return objectsWithData;
  } catch (error) {
    console.error("Error:", error.message);
    return [];
  }
}

getAllObjects();