//Solucion con For


const myNumbersList = [1, 2, 3, 4, 5, 60, 61, 72, 73];
const evenNumbers = [];

for (const number of myNumbersList){
    if (number % 2 === 0) {
        evenNumbers.push(number);
    }
}

console.log(evenNumbers);

//Solucion con Filter


const myNumbersList2 = [1, 2, 3, 4, 5, 60, 61, 72, 73];
const evenNumbers2 = myNumbersList2.filter((number) => number % 2 === 0);

console.log(evenNumbers2)