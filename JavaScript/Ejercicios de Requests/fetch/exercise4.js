const API_URL = "https://api.restful-api.dev/objects";

async function updateObject(id, newData) {
  try {
    const response = await fetch(
      `${API_URL}/${id}`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(newData)
      }
    );

    if (response.status === 404) {
      throw new Error(
        `Object with ID ${id} was not found.`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Error ${response.status}: Failed to update object.`
      );
    }

    const updatedObject = await response.json();

    console.log("Object updated:");
    console.log(updatedObject);

    return updatedObject;
  } catch (error) {
    console.error("Error:", error.message);

    return null;
  }
}

const objectId = "YOUR_OBJECT_ID";

const updatedData = {
  name: "Laptop Test Updated",

  data: {
    brand: "Lenovo",
    year: 2026,
    ram: "32 GB"
  }
};

updateObject(objectId, updatedData);