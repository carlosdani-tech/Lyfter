"""Menu logic for the student control system."""

from actions import (
    create_students,
    delete_student,
    show_all_students,
    show_failed_students,
    show_overall_average,
    show_top_students,
)
from data import DEFAULT_FILE_NAME, export_students_to_csv, import_students_from_csv


MENU_OPTIONS = {
    "1": "Add students",
    "2": "Show all students",
    "3": "Show top 3 students",
    "4": "Show overall average",
    "5": "Show failed students",
    "6": "Delete a student",
    "7": "Export data to CSV",
    "8": "Import data from CSV",
    "9": "Exit",
}


def run_menu():
    """Run the interactive menu loop."""
    students = []

    while True:
        show_menu_options()
        selected_option = prompt_menu_option()

        if selected_option == "1":
            new_students = create_students(students)
            for student in new_students:
                students.append(student)
            print("Students added successfully.")
        elif selected_option == "2":
            show_all_students(students)
        elif selected_option == "3":
            show_top_students(students)
        elif selected_option == "4":
            show_overall_average(students)
        elif selected_option == "5":
            show_failed_students(students)
        elif selected_option == "6":
            delete_student(students)
        elif selected_option == "7":
            export_students_to_csv(students, DEFAULT_FILE_NAME)
        elif selected_option == "8":
            imported_students = import_students_from_csv(DEFAULT_FILE_NAME)
            if imported_students is not None:
                students = imported_students
        elif selected_option == "9":
            print("Goodbye.")
            break


def show_menu_options():
    """Display the main menu options."""
    print("\nStudent Control System")
    for option in MENU_OPTIONS:
        print(option + ". " + MENU_OPTIONS[option])


def prompt_menu_option():
    """Ask for a valid menu option."""
    while True:
        selected_option = input("Choose an option: ").strip()

        if selected_option in MENU_OPTIONS:
            return selected_option

        print("Please choose a valid menu option.")
