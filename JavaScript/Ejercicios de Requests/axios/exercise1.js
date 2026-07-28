const axios = require("axios");

const API_URL = "https://api.restful-api.dev/objects";

async function getAllObjects() {
  try {
    const response = await axios.get(API_URL);

    const objects = response.data;

    console.log("Objects:");

    objects.forEach(function (object) {
      console.log("--------------------");
      console.log(`ID: ${object.id}`);
      console.log(`Name: ${object.name}`);
      console.log("Data:", object.data);
    });
  } catch (error) {
    console.error(
      "Error:",
      error.response?.data || error.message
    );
  }
}

getAllObjects();