CREATE DATABASE  IF NOT EXISTS `acm_v1`;
USE `acm_v1`;
-- Drop all tables in reverse-dependency order


-- Create parent table first
CREATE TABLE IF NOT EXISTS `Organizations` (
  `OrganizationID`   INT           PRIMARY KEY AUTO_INCREMENT,
  `Name`             VARCHAR(255)  NOT NULL,
  `Type`             VARCHAR(255),
  `Description`      TEXT,
  `CreatedAt`        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Departments depends on Organizations
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

-- Projects depends on Departments
CREATE TABLE IF NOT EXISTS `Projects` (
  `ProjectID`        INT           PRIMARY KEY AUTO_INCREMENT,
  `DepartmentID`     INT           NOT NULL,
  `Name`             VARCHAR(255)  NOT NULL,
  `StartDate`        DATE,
  `EndDate`          DATE,
  `Budget`           DECIMAL(15,2),
  `Spending`        DECIMAL(15,2) DEFAULT 0.00,
  `Status`          VARCHAR(50)   DEFAULT 'Not Started',
  `Description`     TEXT,
  `CreatedAt`       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`DepartmentID`)
    REFERENCES `Departments`(`DepartmentID`)
      ON DELETE CASCADE
);

-- Clients depends on Projects
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

-- Transactions depends on Projects (updated: no Item/Vendor, keep Note)
CREATE TABLE IF NOT EXISTS `Transactions` (
  `TxnID`        INT           PRIMARY KEY AUTO_INCREMENT,
  `ProjectID`    INT           NOT NULL,
  `TxnDate`      DATE          NOT NULL,
  `Category`     VARCHAR(100)  NOT NULL,
  `ExpenseType`  ENUM('Expense','Receipt') NOT NULL,
  `Item`         VARCHAR(255), -- Item column included
  `Note`         TEXT,
  `Amount`       DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (`ProjectID`)
    REFERENCES `Projects`(`ProjectID`)
      ON DELETE CASCADE
);

-- AuditUploads table for audit file uploads
CREATE TABLE IF NOT EXISTS `AuditUploads` (
  `AuditID` INT AUTO_INCREMENT PRIMARY KEY,
  `UploaderEmail` VARCHAR(255),
  `UploadDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `FileName` VARCHAR(255),
  `RowCount` INT,
  `OrganizationID` INT,
  `Notes` TEXT
);

-- Sample data inserts (run after all tables exist)
-- INSERT INTO Organizations (Name, Type) VALUES
--   ('TechSoft Solutions',      'Software Company'),
--   ('BuildCraft Enterprises',  'Construction & Interior Design');

-- INSERT INTO Departments (OrganizationID, Name) VALUES
--   (1, 'IT'),
--   (1, 'Finance'),
--   (2, 'Infrastructure'),
--   (2, 'Design Studioz');

-- INSERT INTO Projects (DepartmentID, Name, StartDate, EndDate, Budget, Status) VALUES
--   (1, 'New Website Development', '2025-01-15', '2025-06-30',  50000.00, 'In Progress'),
--   (2, 'Q3 Financial Audit',      '2025-07-01', '2025-09-30',  20000.00, 'Not Started'),
--   (3, 'Highway Villas Construction', '2024-09-01', '2026-03-31', 6000000.00, 'In Progress'),
--   (4, 'Luxury Apartment Interiors',  '2025-02-01', '2025-12-31', 1200000.00, 'In Progress');

-- INSERT INTO Clients (ProjectID, Name, ContactDetails, ContractAmount, PurchaseDate) VALUES
--   (1, 'ABC Corp',     'john.doe@abccorp.com',    25000.00, '2025-02-20'),
--   (3, 'Mr. Smith',    'smith@example.com',     1000000.00, '2024-10-15');

-- ===== Demo seed data (two organizations only) =====
INSERT INTO Organizations (OrganizationID, Name, Type, Description) VALUES
  (1, 'TechSoft Solutions',     'Software Company',         'Enterprise software and SaaS provider'),
  (2, 'BuildCraft Enterprises', 'Construction & Interior Design', 'Commercial and residential construction');

INSERT INTO Departments (DepartmentID, OrganizationID, Name, Description) VALUES
  (1, 1, 'IT',            'Platform engineering and operations'),
  (2, 1, 'Finance',       'Accounting and finance ops'),
  (3, 1, 'Product',       'Product management and UX'),
  (4, 2, 'Infrastructure','Site engineering and construction management'),
  (5, 2, 'Design Studioz','Interiors and finishes design'),
  (6, 2, 'Safety',        'Health & safety compliance');

INSERT INTO Projects (ProjectID, DepartmentID, Name, StartDate, EndDate, Budget, Spending, Status, Description) VALUES
  (1, 1, 'New Website Development',       '2025-01-15', '2025-06-30',   50000.00,   18000.00, 'In Progress', 'Rebuild marketing site and customer portal'),
  (2, 2, 'Q3 Financial Audit',            '2025-07-01', '2025-09-30',   20000.00,    2000.00, 'Not Started', 'External audit and controls review'),
  (3, 4, 'Highway Villas Construction',   '2024-09-01', '2026-03-31', 6000000.00, 1500000.00, 'In Progress', 'Luxury villas mixed-use development'),
  (4, 5, 'Luxury Apartment Interiors',    '2025-02-01', '2025-12-31', 1200000.00,  450000.00, 'In Progress', 'High-end interior fit-outs'),
  (5, 3, 'Mobile App MVP',                '2025-03-01', '2025-08-15',  120000.00,   80000.00, 'Active', 'Customer-facing mobile app launch'),
  (6, 5, 'Showroom Renovation',           '2025-03-10', '2025-07-20',  250000.00,   90000.00, 'In Progress', 'Update flagship showroom and samples');

  -- Sample data for Transactions (use after Projects seed)
INSERT INTO `Transactions` (ProjectID, TxnDate, Category, ExpenseType, Item, Note, Amount) VALUES
  (1, '2025-02-20', 'Hosting',       'Expense', 'GoDaddy Hosting',            'Monthly hosting fee',            1200.00),
  (1, '2025-03-03', 'Design',        'Expense', 'Hero Section',               'Hero section design',            4500.00),
  (1, '2025-03-15', 'Client Payment','Receipt', 'Milestone 1',                'Milestone 1 payment (ABC Corp)', 20000.00),
  (3, '2024-10-20', 'Materials',     'Expense', 'Concrete Batch',             'Concrete batch (BuildSupply)',   750000.00),
  (3, '2025-02-28', 'Client Payment','Receipt', 'Progress Payment',           'Progress payment (Constructor Corp)', 300000.00),
  (6, '2025-04-01', 'Labor',         'Expense', 'Carpentry Crew',             'Carpentry crew (week 1)',        15000.00),
  (5, '2025-04-10', 'Software',      'Expense', 'Auth Provider Subscription', 'Auth provider subscription (AuthCorp)', 499.00),
  (2, '2025-08-05', 'Audit Fees',    'Expense', 'External Audit',             'External audit (prelim)',        8000.00);

INSERT INTO Clients (ClientID, ProjectID, Name, ContactDetails, ContractAmount, PurchaseDate) VALUES
  (1, 1, 'ABC Corp',         'john.doe@abccorp.com',     25000.00,  '2025-02-20'),
  (2, 3, 'Mr. Smith',        'smith@example.com',      1000000.00,  '2024-10-15'),
  (3, 4, 'LuxeLiving LLC',   'info@luxeliving.com',     350000.00,  '2025-03-01'),
  (4, 5, 'GreenStart Inc.',  'partnerships@greenstart.io', 60000.00, '2025-03-20'),
  (5, 6, 'DesignHouse Ltd',  'contact@designhouse.co',   50000.00, '2025-03-15'),
  (6, 3, 'Constructor Corp', 'pm@constructor.com',     800000.00,  '2025-02-28');

-- ===== end two-organization demo seed =====

