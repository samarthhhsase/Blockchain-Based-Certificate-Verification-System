ALTER TABLE certificates
MODIFY COLUMN status ENUM('Valid', 'Revoked', 'Expired', 'Active') DEFAULT 'Valid';

UPDATE certificates
SET status = 'Valid'
WHERE status = 'Active';

ALTER TABLE complaints
ADD COLUMN response TEXT NULL AFTER message;
