"""Import and export logic for student data."""

import csv
import os

from actions import (
    is_valid_name,
    is_valid_section,
    normalize_name,
    normalize_section,
    student_exists,
)
from student import Student


DEFAULT_FILE_NAME = "students.csv"
CSV_HEADERS = [
    "full_name",
    "section",
    "spanish_grade",
    "english_grade",
    "social_studies_grade",
    "science_grade",
]


def export_students_to_csv(students, file_name=DEFAULT_FILE_NAME):
    """Export all students to a CSV file."""
    if len(students) == 0:
        print("There are no students to export.")
        return

    with open(file_name, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_HEADERS)
        writer.writeheader()

        for student in students:
            writer.writerow(student.to_dict())

    print("Data exported successfully to: " + os.path.abspath(file_name))


def import_students_from_csv(file_name=DEFAULT_FILE_NAME):
    """Import students from a CSV file."""
    if not os.path.exists(file_name):
        print("No exported file was found at: " + os.path.abspath(file_name))
        return None

    imported_students = []

    with open(file_name, "r", newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = list(reader)

    if reader.fieldnames != CSV_HEADERS:
        print("The CSV file format is not valid for this program.")
        return None

    row_number = 2

    for row in rows:
        student = build_student_from_row(row, row_number, imported_students)

        if student is None:
            return None

        imported_students.append(student)
        row_number += 1

    print("Data imported successfully from: " + os.path.abspath(file_name))
    return imported_students


def build_student_from_row(row, row_number, existing_students):
    """Convert one CSV row dictionary into a validated Student object."""
    if len(row) != len(CSV_HEADERS):
        print("Invalid number of columns on row " + str(row_number) + ".")
        return None

    full_name = row["full_name"].strip()
    section = row["section"].strip()

    if full_name == "":
        print("Missing value for 'full_name' on row " + str(row_number) + ".")
        return None

    if section == "":
        print("Missing value for 'section' on row " + str(row_number) + ".")
        return None

    full_name = normalize_name(full_name)
    section = normalize_section(section)

    if not is_valid_name(full_name):
        print("Invalid full_name value on row " + str(row_number) + ".")
        return None

    if not is_valid_section(section):
        print("Invalid section value on row " + str(row_number) + ".")
        return None

    if student_exists(existing_students, full_name, section):
        print(
            "Duplicate student found on row "
            + str(row_number)
            + ": "
            + full_name
            + " - "
            + section
            + "."
        )
        return None

    spanish_grade = parse_grade_value(row["spanish_grade"], "spanish_grade", row_number)
    english_grade = parse_grade_value(row["english_grade"], "english_grade", row_number)
    social_studies_grade = parse_grade_value(
        row["social_studies_grade"], "social_studies_grade", row_number
    )
    science_grade = parse_grade_value(row["science_grade"], "science_grade", row_number)

    if (
        spanish_grade is None
        or english_grade is None
        or social_studies_grade is None
        or science_grade is None
    ):
        return None

    student_data = {
        "full_name": full_name,
        "section": section,
        "spanish_grade": spanish_grade,
        "english_grade": english_grade,
        "social_studies_grade": social_studies_grade,
        "science_grade": science_grade,
    }
    return Student.from_dict(student_data)


def parse_grade_value(value, field_name, row_number):
    """Validate and convert one grade value from CSV."""
    try:
        grade = float(value.strip())
    except ValueError:
        print(
            "Invalid numeric value for '"
            + field_name
            + "' on row "
            + str(row_number)
            + "."
        )
        return None

    if 0 <= grade <= 100:
        return grade

    print(
        "The value for '"
        + field_name
        + "' on row "
        + str(row_number)
        + " must be between 0 and 100."
    )
    return None
