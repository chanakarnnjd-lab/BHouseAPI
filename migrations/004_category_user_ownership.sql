-- Existing categories must be associated with recipes belonging to exactly one user.
-- The NOT NULL change intentionally fails if any category is orphaned or shared by multiple users.
ALTER TABLE categories
  ADD COLUMN userId VARCHAR(20) NULL AFTER categoryId;

UPDATE categories c
JOIN (
  SELECT rc.categoryId, MIN(r.userId) AS userId
  FROM recipes_categories rc
  INNER JOIN recipes r ON r.recipesId = rc.recipesId
  GROUP BY rc.categoryId
  HAVING COUNT(DISTINCT r.userId) = 1
) owners ON owners.categoryId = c.categoryId
SET c.userId = owners.userId;

ALTER TABLE categories
  MODIFY COLUMN userId VARCHAR(20) NOT NULL,
  DROP INDEX uq_categories_categoryName,
  ADD UNIQUE KEY uq_categories_user_categoryName (userId, categoryName),
  ADD CONSTRAINT categories_users_FK
    FOREIGN KEY (userId) REFERENCES users (userId)
    ON DELETE CASCADE ON UPDATE CASCADE;
