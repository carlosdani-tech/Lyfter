const userId =
  localStorage.getItem("userId");

const message =
  document.getElementById("message");


if (!userId) {
  window.location.href = "./login.html";
}


async function loadProfile() {
  try {
    const user =
      await getUserById(userId);

    document.getElementById(
      "user-name"
    ).textContent = user.name;

    document.getElementById(
      "user-id"
    ).textContent = user.id;

    document.getElementById(
      "user-email"
    ).textContent = user.data.email;

  } catch (error) {
    message.textContent = error.message;
    message.className = "error";
  }
}


document.getElementById(
  "logout-button"
).addEventListener(
  "click",
  function () {

    localStorage.removeItem("userId");

    window.location.href =
      "./login.html";
  }
);


loadProfile();