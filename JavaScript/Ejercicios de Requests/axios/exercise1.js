const axios = require("axios");

const API_URL = "https://api.restful-api.dev/objects";

async function getAllObjects() {
  try {
    const response = await axios.get(API_URL);

    const objects = response.data;

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
    if (error.response) {
      console.error(
        `Error ${error.response.status}:`,
        error.response.data
      );
    } else {
      console.error("Error:", error.message);
    }

    return [];
  }
}

getAllObjects();