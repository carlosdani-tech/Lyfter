function checkNumber (number, evenCall, oddCall) {
    if (number % 2 === 0) {
        evenCall ();
    } else {
        oddCall ();
    }
}

function showEvenMessage() {
  console.log("The number is even!");
}

function showOddMessage() {
  console.log("The number is odd!");
}

checkNumber (12, showEvenMessage, showOddMessage);