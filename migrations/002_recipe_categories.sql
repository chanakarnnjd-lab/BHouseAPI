CREATE TABLE IF NOT EXISTS categories (
  categoryId INT NOT NULL AUTO_INCREMENT,
  categoryName VARCHAR(100) NOT NULL,
  PRIMARY KEY (categoryId),
  UNIQUE KEY uq_categories_categoryName (categoryName)
);

CREATE TABLE IF NOT EXISTS recipes_categories (
  recipesId INT NOT NULL,
  categoryId INT NOT NULL,
  PRIMARY KEY (recipesId, categoryId),
  KEY idx_recipes_categories_categoryId (categoryId),
  CONSTRAINT recipes_categories_recipes_FK
    FOREIGN KEY (recipesId) REFERENCES recipes (recipesId)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT recipes_categories_categories_FK
    FOREIGN KEY (categoryId) REFERENCES categories (categoryId)
    ON DELETE CASCADE ON UPDATE CASCADE
);
