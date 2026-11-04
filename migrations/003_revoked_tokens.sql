CREATE TABLE IF NOT EXISTS revoked_tokens (
  tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expiresAt DATETIME NOT NULL,
  PRIMARY KEY (tokenHash),
  KEY idx_revoked_tokens_expiresAt (expiresAt)
);
