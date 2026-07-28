const API_URL = "https://api.restful-api.dev/objects";

async function getAllObjects() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(
        `Error ${response.status}: Failed to get objects.`
      );
    }

    const objects = await response.json();

    console.log("Objects:");

    objects.forEach(function (object) {
      console.log("--------------------");
      console.log(`ID: ${object.id}`);
      console.log(`Name: ${object.name}`);
      console.log("Data:", object.data);
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getAllObjects();