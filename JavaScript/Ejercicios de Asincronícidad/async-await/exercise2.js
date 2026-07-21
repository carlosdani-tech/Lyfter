const API_KEY = "PLACEHOLDER";
const USER_URL = "https://reqres.in/api/users/23";

async function getMissingUser() {
  try {
    const response = await fetch(USER_URL, {
      headers: {
        "x-api-key": API_KEY
      }
    });

    if (response.status === 404) {
      throw new Error("The requested user was not found.");
    }

    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}`
      );
    }

    const result = await response.json();

    console.log(result.data);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getMissingUser();