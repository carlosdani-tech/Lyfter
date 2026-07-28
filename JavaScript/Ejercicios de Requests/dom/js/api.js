const API_URL = "https://api.restful-api.dev/objects";

async function createUser(userData) {
  try {
    const response = await axios.post(
      API_URL,
      userData
    );

    return response.data;
  } catch (error) {
    console.error(error);

    throw new Error(
      "No fue posible registrar el usuario."
    );
  }
}


async function getUserById(id) {
  try {
    const response = await axios.get(
      `${API_URL}/${id}`
    );

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(
        "El usuario no existe."
      );
    }

    throw new Error(
      "No fue posible obtener el usuario."
    );
  }
}


async function updateUser(id, userData) {
  try {
    const response = await axios.put(
      `${API_URL}/${id}`,
      userData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      "No fue posible actualizar el usuario."
    );
  }
}