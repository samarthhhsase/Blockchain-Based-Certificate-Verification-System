ALTER TABLE users
MODIFY COLUMN role ENUM('admin', 'issuer', 'student') NOT NULL;

ALTER TABLE certificates
ADD COLUMN ipfs_hash VARCHAR(255) NOT NULL AFTER blockchain_tx_hash,
ADD COLUMN status ENUM('Active', 'Revoked', 'Expired') DEFAULT 'Active' AFTER ipfs_hash;

UPDATE certificates
SET status = CASE
  WHEN is_revoked = TRUE THEN 'Revoked'
  ELSE 'Active'
END;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  certificate_id INT NULL,
  old_data TEXT NULL,
  new_data TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_certificate (certificate_id),
  INDEX idx_audit_action (action)
);
