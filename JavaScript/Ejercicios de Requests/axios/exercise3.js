const axios = require("axios");

const API_URL = "https://api.restful-api.dev/objects";

async function getObjectById(id) {
  try {
    const response = await axios.get(
      `${API_URL}/${id}`
    );

    console.log("Object found:");
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

getObjectById("YOUR_OBJECT_ID");