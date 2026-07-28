const API_KEY = "PLACEHOLDER";
const USER_URL = "https://reqres.in/api/users/2";

async function getUser() {
  try {
    const response = await fetch(USER_URL, {
      headers: {
        "x-api-key": API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}`
      );
    }

    const result = await response.json();
    const user = result.data;

    console.log("User information:");
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.first_name}`);
    console.log(`Last name: ${user.last_name}`);
    console.log(`Email: ${user.email}`);
  } catch (error) {
    console.error("Error getting the user:", error.message);
  }
}

getUser();