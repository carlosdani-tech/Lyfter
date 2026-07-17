const student = {
  name: "John Doe",
  grades: [
    { name: "math", grade: 80 },
    { name: "science", grade: 95 },
    { name: "history", grade: 65 },
    { name: "PE", grade: 90 },
    { name: "music", grade: 98 }
  ]
};

let totalGrades = 0;
let highestSubject = student.grades[0];
let lowestSubject = student.grades[0];

for (const subject of student.grades) {
  totalGrades += subject.grade;

  if (subject.grade > highestSubject.grade) {
    highestSubject = subject;
  }

  if (subject.grade < lowestSubject.grade) {
    lowestSubject = subject;
  }
}

const gradeAverage = totalGrades / student.grades.length;

const result = {
  name: student.name,
  gradeAvg: gradeAverage,
  highestGrade: highestSubject.name,
  lowestGrade: lowestSubject.name
};

console.log(result);