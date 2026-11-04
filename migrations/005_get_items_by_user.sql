DELIMITER $$

DROP PROCEDURE IF EXISTS getAllItemsByUser$$

CREATE PROCEDURE getAllItemsByUser(IN p_userId VARCHAR(20))
BEGIN
  WITH RECURSIVE unit_hierarchy AS (
    SELECT
      i.itemId,
      u.unitId,
      u.parentId,
      CAST(u.N AS DECIMAL(15)) AS multi
    FROM items i
    INNER JOIN units u ON i.unitId = u.unitId
    WHERE i.userId = p_userId

    UNION ALL

    SELECT
      uh.itemId,
      u.unitId,
      u.parentId,
      CAST(uh.multi * u.N AS DECIMAL(15, 0)) AS multi
    FROM unit_hierarchy uh
    INNER JOIN units u ON uh.parentId = u.unitId
  ),
  smallest_units AS (
    SELECT
      uh.itemId,
      uh.unitId AS smallest_unit_id,
      uh.multi
    FROM unit_hierarchy uh
    WHERE uh.parentId IS NULL
  )
  SELECT
    i.*,
    u.unitName AS unit_name,
    su.multi
  FROM items i
  INNER JOIN smallest_units su ON i.itemId = su.itemId
  INNER JOIN units u ON su.smallest_unit_id = u.unitId
  WHERE i.userId = p_userId
  ORDER BY i.itemName DESC;
END$$

DELIMITER ;
