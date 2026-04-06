-- 1) Add user_id columns to link role tables with users table.
ALTER TABLE issuers
ADD COLUMN user_id INT NULL AFTER id;

ALTER TABLE students
ADD COLUMN user_id INT NULL AFTER id;

-- 2) Populate user_id from users table based on matching email.
UPDATE issuers i
JOIN users u ON i.email = u.email
SET i.user_id = u.id
WHERE i.user_id IS NULL;

UPDATE students s
JOIN users u ON s.email = u.email
SET s.user_id = u.id
WHERE s.user_id IS NULL;

-- 3) Enforce one-to-one mapping and referential integrity.
ALTER TABLE issuers
MODIFY COLUMN user_id INT NOT NULL,
ADD UNIQUE KEY uq_issuers_user_id (user_id),
ADD CONSTRAINT fk_issuers_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE students
MODIFY COLUMN user_id INT NOT NULL,
ADD UNIQUE KEY uq_students_user_id (user_id),
ADD CONSTRAINT fk_students_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4) Optional verification queries:
-- DESCRIBE issuers;
-- DESCRIBE students;
-- SELECT * FROM issuers;
-- SELECT * FROM students;
