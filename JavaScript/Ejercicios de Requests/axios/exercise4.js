const axios = require("axios");

const API_URL = "https://api.restful-api.dev/objects";

async function updateObject(id, newData) {
  try {
    const response = await axios.put(
      `${API_URL}/${id}`,
      newData
    );

    console.log("Object updated:");
    console.log(response.data);

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error(
        `Object with ID ${id} was not found.`
      );

      return null;
    }

    console.error(
      "Error:",
      error.response?.data || error.message
    );

    return null;
  }
}

const objectId = "YOUR_OBJECT_ID";

const updatedData = {
  name: "Axios Laptop Updated",

  data: {
    brand: "Dell",
    year: 2026,
    ram: "32 GB"
  }
};

updateObject(objectId, updatedData);