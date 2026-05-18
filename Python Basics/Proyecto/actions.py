"""Business logic for student management actions."""

PASSING_GRADE = 60


def create_students(existing_students):
    """Collect a list of students from user input."""
    student_count = prompt_student_count()
    new_students = []

    for index in range(student_count):
        print("\nEntering information for student #" + str(index + 1))
        student = prompt_student_data(existing_students + new_students)
        new_students.append(student)

    return new_students


def prompt_student_count():
    """Ask for the number of students to register."""
    while True:
        raw_value = input("How many students do you want to enter? ").strip()

        if not raw_value.isdigit():
            print("Please enter a valid positive whole number.")
            continue

        student_count = int(raw_value)

        if student_count <= 0:
            print("The number of students must be greater than 0.")
            continue

        return student_count


def prompt_student_data(existing_students):
    """Collect all information for one student."""
    full_name = prompt_valid_name("Enter the student's full name: ")
    section = prompt_valid_section("Enter the student's section: ")

    while student_exists(existing_students, full_name, section):
        print("A student with the same full name and section already exists.")
        full_name = prompt_valid_name("Enter a different full name: ")
        section = prompt_valid_section("Enter a different section: ")

    student = {}
    student["full_name"] = full_name
    student["section"] = section
    student["spanish_grade"] = prompt_valid_grade("Enter the Spanish grade: ")
    student["english_grade"] = prompt_valid_grade("Enter the English grade: ")
    student["social_studies_grade"] = prompt_valid_grade(
        "Enter the Social Studies grade: "
    )
    student["science_grade"] = prompt_valid_grade("Enter the Science grade: ")
    return student


def prompt_valid_name(message):
    """Ask for a non-empty name without digits."""
    while True:
        full_name = normalize_name(input(message))

        if is_valid_name(full_name):
            return full_name

        print("Please enter a valid full name without numbers.")


def prompt_valid_section(message):
    """Ask for a section in a valid format."""
    while True:
        section = normalize_section(input(message))

        if is_valid_section(section):
            return section

        print("Please enter a valid section such as 10A or 11B.")


def prompt_valid_grade(message):
    """Ask for a grade between 0 and 100."""
    while True:
        raw_value = input(message).strip()

        try:
            grade = float(raw_value)
        except ValueError:
            print("Please enter a numeric grade between 0 and 100.")
            continue

        if 0 <= grade <= 100:
            return grade

        print("The grade must be between 0 and 100.")


def show_all_students(students):
    """Display all students and their grades."""
    if len(students) == 0:
        print("There are no students registered.")
        return

    print("\nRegistered students:")
    index = 1

    for student in students:
        average = calculate_student_average(student)
        print("\nStudent #" + str(index))
        print("Full name: " + student["full_name"])
        print("Section: " + student["section"])
        print("Spanish: " + format(student["spanish_grade"], ".2f"))
        print("English: " + format(student["english_grade"], ".2f"))
        print("Social Studies: " + format(student["social_studies_grade"], ".2f"))
        print("Science: " + format(student["science_grade"], ".2f"))
        print("Average: " + format(average, ".2f"))
        index += 1


def show_top_students(students, top_count=3):
    """Display the top students by average grade."""
    if len(students) == 0:
        print("There are no students registered.")
        return

    ranked_students = sorted(students, key=calculate_student_average, reverse=True)
    top_students = ranked_students[:top_count]

    print("\nTop " + str(len(top_students)) + " students by average grade:")
    position = 1

    for student in top_students:
        average = calculate_student_average(student)
        print(
            str(position)
            + ". "
            + student["full_name"]
            + " | Section: "
            + student["section"]
            + " | Average: "
            + format(average, ".2f")
        )
        position += 1


def show_overall_average(students):
    """Display the average of all student averages."""
    if len(students) == 0:
        print("There are no students registered.")
        return

    overall_average = calculate_overall_average(students)
    print("The overall average grade is: " + format(overall_average, ".2f"))


def show_failed_students(students):
    """Display all students with at least one failed subject."""
    if len(students) == 0:
        print("There are no students registered.")
        return

    failed_students = []

    for student in students:
        if has_failed_subject(student):
            failed_students.append(student)

    if len(failed_students) == 0:
        print("There are no failed students.")
        return

    print("\nFailed students:")
    for student in failed_students:
        failed_subjects = get_failed_subjects(student)
        failed_subjects_text = ""

        for index in range(len(failed_subjects)):
            subject_name = failed_subjects[index][0]
            grade = failed_subjects[index][1]
            failed_subjects_text += subject_name + ": " + format(grade, ".2f")

            if index < len(failed_subjects) - 1:
                failed_subjects_text += ", "

        print(
            student["full_name"]
            + " | Section: "
            + student["section"]
            + " | Failed subjects: "
            + failed_subjects_text
        )


def delete_student(students):
    """Delete one student by full name and section."""
    if len(students) == 0:
        print("There are no students registered.")
        return

    full_name = prompt_valid_name("Enter the full name of the student to delete: ")
    section = prompt_valid_section("Enter the student's section: ")
    student_index = find_student_index(students, full_name, section)

    if student_index is None:
        print("The student was not found.")
        return

    student = students[student_index]
    print("Student found: " + student["full_name"] + " | Section: " + student["section"])

    if confirm_action("Are you sure you want to delete this student? (y/n): "):
        students.pop(student_index)
        print("Student deleted successfully.")
    else:
        print("Deletion cancelled.")


def confirm_action(message):
    """Ask for a yes or no confirmation."""
    while True:
        answer = input(message).strip().lower()

        if answer == "y" or answer == "yes":
            return True

        if answer == "n" or answer == "no":
            return False

        print("Please answer with y/yes or n/no.")


def is_valid_name(full_name):
    """Validate that a full name is not empty and contains no digits."""
    if full_name == "":
        return False

    for character in full_name:
        if character.isdigit():
            return False

        if not character.isalpha() and character != " " and character != "-" and character != "'":
            return False

    return True


def is_valid_section(section):
    """Validate the section format."""
    if len(section) < 2 or len(section) > 3:
        return False

    number_part = section[:-1]
    letter_part = section[-1]

    if not number_part.isdigit():
        return False

    if not letter_part.isalpha():
        return False

    return True


def student_exists(students, full_name, section):
    """Check whether a student already exists."""
    student_index = find_student_index(students, full_name, section)

    if student_index is None:
        return False

    return True


def find_student_index(students, full_name, section):
    """Find the index of a student by full name and section."""
    normalized_name = normalize_name(full_name)
    normalized_section = normalize_section(section)

    for index in range(len(students)):
        student = students[index]
        same_name = normalize_name(student["full_name"]) == normalized_name
        same_section = normalize_section(student["section"]) == normalized_section

        if same_name and same_section:
            return index

    return None


def has_failed_subject(student):
    """Check whether the student failed at least one subject."""
    grades = get_student_grades(student)

    for grade in grades:
        if grade < PASSING_GRADE:
            return True

    return False


def get_failed_subjects(student):
    """Return the list of failed subjects for a student."""
    failed_subjects = []

    if student["spanish_grade"] < PASSING_GRADE:
        failed_subjects.append(("Spanish", student["spanish_grade"]))

    if student["english_grade"] < PASSING_GRADE:
        failed_subjects.append(("English", student["english_grade"]))

    if student["social_studies_grade"] < PASSING_GRADE:
        failed_subjects.append(("Social Studies", student["social_studies_grade"]))

    if student["science_grade"] < PASSING_GRADE:
        failed_subjects.append(("Science", student["science_grade"]))

    return failed_subjects


def calculate_student_average(student):
    """Calculate the average grade for one student."""
    total = 0
    count = 0

    for grade in get_student_grades(student):
        total += grade
        count += 1

    return total / count


def calculate_overall_average(students):
    """Calculate the average of all student averages."""
    total_average = 0

    for student in students:
        total_average += calculate_student_average(student)

    return total_average / len(students)


def get_student_grades(student):
    """Return the numeric grades of one student."""
    grades = []
    grades.append(student["spanish_grade"])
    grades.append(student["english_grade"])
    grades.append(student["social_studies_grade"])
    grades.append(student["science_grade"])
    return grades


def normalize_name(full_name):
    """Normalize a full name for storage and comparisons."""
    cleaned_name = " ".join(full_name.strip().split())
    return cleaned_name.title()


def normalize_section(section):
    """Normalize a section for storage and comparisons."""
    return section.strip().upper()