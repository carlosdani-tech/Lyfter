const registerForm =
  document.getElementById("register-form");

const message =
  document.getElementById("message");


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
      const createdUser =
        await createUser(newUser);

      alert(
        `Usuario creado correctamente. ` +
        `Tu ID es: ${createdUser.id}`
      );

      message.textContent =
        `Guarde su ID: ${createdUser.id}`;

      message.className = "success";

      registerForm.reset();

    } catch (error) {
      message.textContent = error.message;
      message.className = "error";
    }
  }
);