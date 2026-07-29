const userId =
  localStorage.getItem("userId");

const passwordForm =
  document.getElementById("password-form");

const message =
  document.getElementById("message");


if (!userId) {
  window.location.href = "./login.html";
}


passwordForm.addEventListener(
  "submit",
  async function (event) {

    event.preventDefault();

    const currentPassword =
      document.getElementById(
        "current-password"
      ).value;

    const newPassword =
      document.getElementById(
        "new-password"
      ).value;

    const confirmPassword =
      document.getElementById(
        "confirm-password"
      ).value;


    if (newPassword !== confirmPassword) {
      message.textContent =
        "La nueva contraseña y la confirmación no coinciden.";

      message.className = "error";

      return;
    }


    try {
      const user =
        await getUserById(userId);


      if (
        user.data.password !==
        currentPassword
      ) {
        throw new Error(
          "La contraseña actual es incorrecta."
        );
      }


      const updatedUser = {
        name: user.name,

        data: {
          ...user.data,
          password: newPassword
        }
      };


      await updateUser(
        userId,
        updatedUser
      );


      message.textContent =
        "Contraseña actualizada correctamente.";

      message.className = "success";

      passwordForm.reset();

    } catch (error) {
      message.textContent =
        error.message;

      message.className = "error";
    }
  }
);