# School Database Design

## 1. Tables

### Students

The `students` table stores information about each student. It contains `student_id` as the primary key, the student's name, and email address. The email is unique so that two students cannot register with the same email.

### Courses

The `courses` table stores the courses offered by the school. It contains `course_id` as the primary key and `course_name`, which is required and unique.

### Enrolments

The `enrolments` table records which students are enrolled in which courses. It contains `enrolment_id` as the primary key, `student_id` and `course_id` as foreign keys, and a grade for each enrolment. The combination of `student_id` and `course_id` is unique to prevent a student from enrolling in the same course twice.

## 2. Relationships

**One-to-many:** A student can have many enrolments, but each enrolment belongs to one student. Similarly, a course can have many enrolments, but each enrolment belongs to one course.

**Many-to-many:** Students and courses have a many-to-many relationship because one student can take multiple courses and one course can have multiple students. The `enrolments` table is needed as a join table to represent this relationship. It also stores additional information, such as each student's grade for a particular course.

## 3. Index

I would add an index on `enrolments(course_id)` to help the database find enrolments for a particular course more efficiently. This would be useful when listing students on a course or counting enrolments per course. The unique constraint on `(student_id, course_id)` already creates an index for that column combination, but it does not replace an index beginning with `course_id`.

## 4. SQL or NoSQL?

I would choose SQL for this school system because the data is structured and has clear relationships between students, courses, and enrolments. A relational database supports primary keys, foreign keys, uniqueness rules, and joins, which help maintain data integrity and retrieve related information accurately. SQL is also suitable for queries involving grouping and counting students per course. A NoSQL database could be useful for flexible or rapidly changing document data, but a relational database is the better fit for these requirements.
