const API_URL = "https://api.restful-api.dev/objects";

async function createObject(objectData) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(objectData)
    });

    if (!response.ok) {
      throw new Error(
        `Error ${response.status}: Failed to create object.`
      );
    }

    const createdObject = await response.json();

    console.log("Object created:");
    console.log(createdObject);

    console.log(
      `IMPORTANT - Save this ID: ${createdObject.id}`
    );

    return createdObject;
  } catch (error) {
    console.error("Error:", error.message);

    return null;
  }
}

const newObject = {
  name: "Laptop Test",
  data: {
    brand: "Lenovo",
    year: 2026,
    ram: "16 GB"
  }
};

createObject(newObject);