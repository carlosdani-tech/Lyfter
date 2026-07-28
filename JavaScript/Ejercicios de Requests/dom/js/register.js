const registerForm =
  document.getElementById("register-form");

const message =
  document.getElementById("message");

if (localStorage.getItem("userId")) {
  window.location.href = "./profile.html";
}

registerForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const name =
      document.getElementById("name").value.trim();

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value;

    const newUser = {
      name: name,

      data: {
        email: email,
        password: password
      }
    };

    try {
      message.textContent = "Creando usuario...";
      message.className = "loading";

      const createdUser =
        await createUser(newUser);

      localStorage.setItem(
        "userId",
        createdUser.id
      );

      alert(
        `Usuario creado correctamente. Tu ID es: ${createdUser.id}`
      );

      window.location.href = "./profile.html";
    } catch (error) {
      message.textContent = error.message;
      message.className = "error";
    }
  }
);