CREATE DATABASE  IF NOT EXISTS `acm_v3`;
USE `acm_v3`;

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
  `Name`             VARCHAR(255),
  `DepartmentID`     INT,
  `StartDate`        DATE,
  `EndDate`          DATE,
  `Budget`           DECIMAL(15,2),
  `Spending`         DECIMAL(15,2),
  `Description`      TEXT,
  `Status`           VARCHAR(50) DEFAULT 'Not Started',
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

CREATE TABLE IF NOT EXISTS `Users` (
  `UserID` INT PRIMARY KEY AUTO_INCREMENT,
  `Email` VARCHAR(255) UNIQUE NOT NULL,
  `Password` VARCHAR(255) NOT NULL,
  `Name` VARCHAR(255),
  `OrganizationID` INT,
  FOREIGN KEY (`OrganizationID`) REFERENCES `Organizations`(`OrganizationID`)
);

CREATE TABLE IF NOT EXISTS Transactions (
  TxnID INT PRIMARY KEY AUTO_INCREMENT,
  ProjectID VARCHAR(255),
  OrganizationID INT,
  TxnDate DATE,
  Category VARCHAR(255),
  Type VARCHAR(255),
  Item VARCHAR(255),
  Note TEXT,
  Amount DECIMAL(15,2)
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

CREATE TABLE IF NOT EXISTS ImportedTransactions (
  ImportedTxnID INT PRIMARY KEY AUTO_INCREMENT,
  OrganizationID INT,
  OrgName VARCHAR(255),
  TxnID VARCHAR(255),
  TxnDate DATE,
  Category VARCHAR(255),
  Item VARCHAR(255),
  Type VARCHAR(255),
  Amount DECIMAL(15,2),
  ProjectID VARCHAR(255),
  ProjectName VARCHAR(255)
);

-- Hardcoded Organizations
INSERT IGNORE INTO Organizations (OrganizationID, Name, Type, Description, CreatedAt)
VALUES (1, 'collabridge', 'software', 'software', NULL);

INSERT IGNORE INTO Organizations (OrganizationID, Name, Type, Description, CreatedAt)
VALUES (2, 'La-tierra', 'Infra', 'infra', NULL);

INSERT IGNORE INTO Users (UserID, Email, Password, Name, OrganizationID)
VALUES (1, 'admin@collabridge.com', '$2b$10$Bkti6IAQl/imtSLez0AM0efL83YPgQinNsyiVLqaYco1ommcS.vi2', 'Admin Collabridge', 1);

INSERT IGNORE INTO Users (UserID, Email, Password, Name, OrganizationID)
VALUES (2, 'admin@la-tierra.com', '$2b$10$Bkti6IAQl/imtSLez0AM0efL83YPgQinNsyiVLqaYco1ommcS.vi2', 'Admin La-tierra', 2);

