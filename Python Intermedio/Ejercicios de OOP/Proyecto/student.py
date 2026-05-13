"""Student entity used by the student control system."""


class Student:
    """Represent one student and their grades."""

    def __init__(
        self,
        full_name,
        section,
        spanish_grade,
        english_grade,
        social_studies_grade,
        science_grade,
    ):
        self.full_name = full_name
        self.section = section
        self.spanish_grade = spanish_grade
        self.english_grade = english_grade
        self.social_studies_grade = social_studies_grade
        self.science_grade = science_grade

    @classmethod
    def from_dict(cls, student_data):
        """Build a Student object from a dictionary."""
        return cls(
            student_data["full_name"],
            student_data["section"],
            student_data["spanish_grade"],
            student_data["english_grade"],
            student_data["social_studies_grade"],
            student_data["science_grade"],
        )

    def to_dict(self):
        """Convert the student object to a dictionary."""
        return {
            "full_name": self.full_name,
            "section": self.section,
            "spanish_grade": self.spanish_grade,
            "english_grade": self.english_grade,
            "social_studies_grade": self.social_studies_grade,
            "science_grade": self.science_grade,
        }
