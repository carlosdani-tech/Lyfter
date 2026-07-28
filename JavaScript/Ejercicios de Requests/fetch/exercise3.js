const API_URL = "https://api.restful-api.dev/objects";

async function getObjectById(id) {
  try {
    const response = await fetch(
      `${API_URL}/${id}`
    );

    if (response.status === 404) {
      throw new Error(
        `Object with ID ${id} was not found.`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Error ${response.status}: Failed to get object.`
      );
    }

    const object = await response.json();

    console.log("Object found:");
    console.log(object);

    return object;
  } catch (error) {
    console.error("Error:", error.message);

    return null;
  }
}

getObjectById("YOUR_OBJECT_ID");