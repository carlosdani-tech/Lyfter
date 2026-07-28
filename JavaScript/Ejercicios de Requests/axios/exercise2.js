const axios = require("axios");

const API_URL = "https://api.restful-api.dev/objects";

async function createObject(objectData) {
  try {
    const response = await axios.post(
      API_URL,
      objectData
    );

    const createdObject = response.data;

    console.log("Object created:");
    console.log(createdObject);

    console.log(
      `IMPORTANT - Save this ID: ${createdObject.id}`
    );

    return createdObject;
  } catch (error) {
    console.error(
      "Error:",
      error.response?.data || error.message
    );

    return null;
  }
}

const newObject = {
  name: "Axios Laptop Test",

  data: {
    brand: "Dell",
    year: 2026,
    ram: "16 GB"
  }
};

createObject(newObject);