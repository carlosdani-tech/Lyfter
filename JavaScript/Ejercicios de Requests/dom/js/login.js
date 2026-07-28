const loginForm =
  document.getElementById("login-form");

const message =
  document.getElementById("message");


if (localStorage.getItem("userId")) {
  window.location.href = "./profile.html";
}


loginForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const userId =
      document.getElementById("user-id")
        .value
        .trim();

    const password =
      document.getElementById("password")
        .value;

    try {
      const user =
        await getUserById(userId);

      if (user.data.password !== password) {
        throw new Error(
          "La contraseña es incorrecta."
        );
      }

      localStorage.setItem(
        "userId",
        user.id
      );

      window.location.href =
        "./profile.html";

    } catch (error) {
      message.textContent = error.message;
      message.className = "error";
    }
  }
);