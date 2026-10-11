
-- Day 6: School Database
-- SQLite database for students, courses, and enrolments.

-- Remove existing tables so the script can be run again.
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- 1. Create the students table.
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- 2. Create the courses table.
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL UNIQUE
);

-- 3. Create the enrolments table.
-- This is the join table connecting students and courses.
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id),

    FOREIGN KEY (course_id)
        REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);

-- 4. Insert at least three students.
INSERT INTO students (student_id, name, email) VALUES
    (1, 'Amina Otieno', 'amina@example.com'),
    (2, 'Brian Kamau', 'brian@example.com'),
    (3, 'Carol Wanjiku', 'carol@example.com');

-- 5. Insert at least three courses.
INSERT INTO courses (course_id, course_name) VALUES
    (1, 'Database Systems'),
    (2, 'Web Development'),
    (3, 'Computer Networks');

-- 6. Insert five enrolments.
-- Carol has no enrolments, so we can test the LEFT JOIN query.
INSERT INTO enrolments
    (enrolment_id, student_id, course_id, grade)
VALUES
    (1, 1, 1, 'A'),
    (2, 1, 2, 'B'),
    (3, 2, 1, 'B'),
    (4, 2, 3, 'A'),
    (5, 1, 3, 'A');

-- QUERY 1:
-- Find all courses for one student by name.
SELECT
    students.name AS student_name,
    courses.course_name,
    enrolments.grade
FROM students
JOIN enrolments
    ON students.student_id = enrolments.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE students.name = 'Amina Otieno';

-- QUERY 2:
-- Find all students enrolled in one course.
SELECT
    students.name AS student_name,
    courses.course_name,
    enrolments.grade
FROM students
JOIN enrolments
    ON students.student_id = enrolments.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE courses.course_name = 'Database Systems';

-- QUERY 3:
-- Count the students enrolled in each course,
-- including courses with zero enrolments.
SELECT
    courses.course_name,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.course_name
ORDER BY courses.course_name;

-- QUERY 4:
-- Find students who have no enrolments.
SELECT
    students.student_id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.student_id = enrolments.student_id
WHERE enrolments.enrolment_id IS NULL;

-- QUERY 5:
-- Update one enrolment's grade.
UPDATE enrolments
SET grade = 'A'
WHERE enrolment_id = 2;
