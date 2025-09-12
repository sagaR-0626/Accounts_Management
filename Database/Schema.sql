CREATE DATABASE  IF NOT EXISTS `acm_v1`;
USE `acm_v1`;

CREATE TABLE IF NOT EXISTS `Organizations` (
  `OrganizationID`   INT           PRIMARY KEY AUTO_INCREMENT,
  `Name`             VARCHAR(255)  NOT NULL,
  `Type`             VARCHAR(255),
  `Description`      TEXT,
  `CreatedAt`        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `Departments` (
  `DepartmentID`     INT           PRIMARY KEY AUTO_INCREMENT,
  `OrganizationID`   INT           NOT NULL,
  `Name`             VARCHAR(255)  NOT NULL,
  `Description`      TEXT,
  `CreatedAt`        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`OrganizationID`)
    REFERENCES `Organizations`(`OrganizationID`)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Projects` (
  `ProjectID`        INT           PRIMARY KEY AUTO_INCREMENT,
  `DepartmentID`     INT           NOT NULL,
  `Name`             VARCHAR(255)  NOT NULL,
  `StartDate`        DATE,
  `EndDate`          DATE,
  `CreatedAt`       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`DepartmentID`)
    REFERENCES `Departments`(`DepartmentID`)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Clients` (
  `ClientID`         INT           PRIMARY KEY AUTO_INCREMENT,
  `ProjectID`        INT           NOT NULL,
  `Name`             VARCHAR(255)  NOT NULL,
  `ContactDetails`   VARCHAR(255),
  `ContractAmount`   DECIMAL(15,2),
  `PurchaseDate`     DATE,
  `CreatedAt`       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ProjectID`)
    REFERENCES `Projects`(`ProjectID`)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Transactions` (
  `TxnID`        INT           PRIMARY KEY AUTO_INCREMENT,
  `OrganizationID` INT         NOT NULL,
  `ProjectID`    INT           NULL,
  `TxnDate`      DATE          NOT NULL,
  `Category`     VARCHAR(100)  NOT NULL,
  `ExpenseType`  ENUM('Expense','Income') NOT NULL,
  `Item`         VARCHAR(255),
  `Note`         TEXT,
  `Amount`       DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (`OrganizationID`)
    REFERENCES `Organizations`(`OrganizationID`)
      ON DELETE CASCADE,
  FOREIGN KEY (`ProjectID`)
    REFERENCES `Projects`(`ProjectID`)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `AuditUploads` (
  `AuditID` INT AUTO_INCREMENT PRIMARY KEY,
  `UploaderEmail` VARCHAR(255),
  `UploadDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `FileName` VARCHAR(255),
  `RowCount` INT,
  `OrganizationID` INT,
  `Notes` TEXT
);
