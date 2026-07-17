// EJERCICIO 1

const addItemButton = document.getElementById("add-item-button");
const clearListButton = document.getElementById("clear-list-button");
const dynamicList = document.getElementById("dynamic-list");

let itemCounter = 1;

if (addItemButton && clearListButton && dynamicList) {
  addItemButton.addEventListener("click", function () {
    const newItem = document.createElement("li");

    newItem.textContent = `Elemento número ${itemCounter}`;

    dynamicList.appendChild(newItem);

    itemCounter++;
  });

  clearListButton.addEventListener("click", function () {
      dynamicList.innerHTML = "";
      itemCounter = 1;
    });
}


// EJERCICIO 2

const textInput = document.getElementById("text-input");
const showTextButton = document.getElementById("show-text-button");
const textResults = document.getElementById("text-results");

if (textInput && showTextButton && textResults) {
  showTextButton.addEventListener("click", function () {
    const inputValue = textInput.value.trim();

    if (inputValue === "") {
      alert("Debe ingresar un texto.");
      textInput.focus();
      return;
    }

    const newParagraph = document.createElement("p");

    newParagraph.textContent = inputValue;

    textResults.appendChild(newParagraph);

    textInput.value = "";
    textInput.focus();
  });

  textInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      showTextButton.click();
    }
  });
}


// EJERCICIO 3

const registrationForm = document.getElementById(
  "registration-form"
);

const employmentYes = document.getElementById(
  "employment-yes"
);

const employmentNo = document.getElementById(
  "employment-no"
);

const employmentField = document.getElementById(
  "employment-field"
);

const employmentNameInput = document.getElementById(
  "employment-name"
);

const formResult = document.getElementById("form-result");

if (
  registrationForm &&
  employmentYes &&
  employmentNo &&
  employmentField &&
  employmentNameInput &&
  formResult
) {
  employmentYes.addEventListener("change", function () {
    employmentField.classList.remove("hidden");

    employmentNameInput.required = true;
    employmentNameInput.focus();
  });

  employmentNo.addEventListener("change", function () {
    employmentField.classList.add("hidden");

    employmentNameInput.required = false;
    employmentNameInput.value = "";
  });

  registrationForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;

    const selectedEmploymentOption = document.querySelector(
      'input[name="hasEmployment"]:checked'
    );

    const hasEmployment =
      selectedEmploymentOption.value === "yes";

    const employmentName = employmentNameInput.value.trim();

    formResult.innerHTML = `
      <h3>Datos registrados</h3>

      <p>
        <strong>Nombre:</strong>
        ${firstName} ${lastName}
      </p>

      <p>
        <strong>Correo:</strong>
        ${email}
      </p>

      <p>
        <strong>Tiene empleo:</strong>
        ${hasEmployment ? "Sí" : "No"}
      </p>

      ${
        hasEmployment
          ? `
            <p>
              <strong>Empleo:</strong>
              ${employmentName}
            </p>
          `
          : ""
      }
    `;

    formResult.classList.remove("hidden");
  });
}