ALTER TABLE issuers
ADD COLUMN email VARCHAR(150) NULL AFTER name,
ADD COLUMN password VARCHAR(255) NULL AFTER email;

ALTER TABLE students
ADD COLUMN email VARCHAR(150) NULL AFTER name,
ADD COLUMN password VARCHAR(255) NULL AFTER email;

UPDATE issuers i
JOIN users u ON i.user_id = u.id
SET i.email = u.email,
    i.password = u.password
WHERE i.email IS NULL OR i.password IS NULL;

UPDATE students s
JOIN users u ON s.user_id = u.id
SET s.email = u.email,
    s.password = u.password
WHERE s.email IS NULL OR s.password IS NULL;

ALTER TABLE issuers
ADD UNIQUE KEY uq_issuers_email (email);

ALTER TABLE students
ADD UNIQUE KEY uq_students_email (email);
