const API_KEY = "PLACEHOLDER";

function getUserWithPromises(userId) {
  const url = `https://reqres.in/api/users/${userId}`;

  console.log(`Searching for user ${userId}...`);

  fetch(url, {
    headers: {
      "x-api-key": API_KEY
    }
  })
    .then(function (response) {
      if (response.status === 404) {
        throw new Error(
          `User ${userId} was not found.`
        );
      }

      if (!response.ok) {
        throw new Error(
          `Request failed with status ${response.status}.`
        );
      }

      return response.json();
    })
    .then(function (result) {
      const user = result.data;

      console.log("User information:");
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.first_name}`);
      console.log(`Last name: ${user.last_name}`);
      console.log(`Email: ${user.email}`);
    })
    .catch(function (error) {
      console.error("Error:", error.message);
    })
    .finally(function () {
      console.log(`Request for user ${userId} finished.`);
    });
}

getUserWithPromises(2);