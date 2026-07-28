const API_KEY = "PLACEHOLDER";
const API_URL = "https://reqres.in/api/users";

const userForm = document.getElementById("user-form");
const userIdInput = document.getElementById("user-id");
const message = document.getElementById("message");

const userResult = document.getElementById("user-result");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");

userForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const userId = userIdInput.value.trim();

  hideUser();
  showMessage("Buscando usuario...", "loading");

  try {
    const response = await fetch(`${API_URL}/${userId}`, {
      headers: {
        "x-api-key": API_KEY
      }
    });

    if (response.status === 404) {
      throw new Error("El usuario no fue encontrado.");
    }

    if (!response.ok) {
      throw new Error(
        `La solicitud falló con el estado ${response.status}.`
      );
    }

    const result = await response.json();
    const user = result.data;

    userName.textContent =
      `${user.first_name} ${user.last_name}`;

    userEmail.textContent = user.email;

    userResult.classList.remove("hidden");
    showMessage("Usuario encontrado.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    userIdInput.value = "";
    userIdInput.focus();
  }
});

function hideUser() {
  userResult.classList.add("hidden");

  userName.textContent = "";
  userEmail.textContent = "";
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = type;
}