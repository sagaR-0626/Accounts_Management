require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// 1) Admin connection (no database specified)

// Bulk import transactions and audit log
const adminConn = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD
});

// 2) Ensure database exists, then wire up the real pool + schema
adminConn.query(
  `CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE}\`;`,
  async (err) => {
    if (err) { /* handle error */ }
    adminConn.end();

    // Create pool
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true
    }).promise();

    async function executeSQLScript(pool, filePath) {
      const sql = fs.readFileSync(filePath, 'utf8');

      // Find first INSERT line to split schema vs seeds (keeps existing behavior)
      const lines = sql.split(/\r?\n/);
      let insertLineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*INSERT\s+INTO/i.test(lines[i])) {
          insertLineIndex = i;
          break;
        }
      }

      const schemaSql = insertLineIndex === -1 ? sql : lines.slice(0, insertLineIndex).join('\n');
      const seedSql = insertLineIndex === -1 ? '' : lines.slice(insertLineIndex).join('\n');

      try {
        // Run schema (CREATE TABLE ...) first
        if (schemaSql.trim()) {
          await pool.query(schemaSql);
          console.log('✔︎ Schema (CREATE TABLE ...) executed successfully');
        }

        if (!seedSql.trim()) return;

        // Split seed SQL into individual statements (basic split on ';')
        const rawStmts = seedSql
          .split(/;\s*(?=\n|$)/) // split on semicolon followed by newline or end
          .map(s => s.trim())
          .filter(s => s.length); // drop empties

        // Group INSERT statements by target table so we can decide per-table whether to run them
        const insertsByTable = {};
        for (const stmt of rawStmts) {
          const m = stmt.match(/INSERT\s+INTO\s+`?([A-Za-z0-9_]+)`?/i);
          if (m) {
            const table = m[1];
            insertsByTable[table] = insertsByTable[table] || [];
            insertsByTable[table].push(stmt + ';');
          } else {
            // non-INSERT statements (or complex statements) - keep under a special key
            insertsByTable.__other = insertsByTable.__other || [];
            insertsByTable.__other.push(stmt + ';');
          }
        }

        // For each table-grouped INSERT, run only if that table is currently empty
        for (const table of Object.keys(insertsByTable)) {
          if (table === '__other') {
            // Run any remaining non-INSERT seed statements (safe to run)
            try {
              await pool.query(insertsByTable.__other.join('\n'));
              console.log('✔︎ Other seed statements executed');
            } catch (err) {
              console.warn('⤷ Skipped/failed other seed statements:', err.message || err);
            }
            continue;
          }

          // Check if the table exists and whether it has rows
          let rowCount = 0;
          try {
            const [rows] = await pool.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
            rowCount = rows && rows[0] ? Number(rows[0].cnt) : 0;
          } catch (err) {
            // Table may not exist or query failed — log and attempt to run inserts anyway
            console.warn(`⤷ Could not query table "${table}" row count:`, err.message || err);
            rowCount = 0;
          }

          if (rowCount === 0) {
            try {
              await pool.query(insertsByTable[table].join('\n'));
              console.log(`✔︎ Seed inserted for table "${table}" (was empty)`);
            } catch (err) {
              console.error(`✖︎ Failed to insert seed for table "${table}":`, err.message || err);
            }
          } else {
            console.log(`⤷ Seed skipped for table "${table}" — already has ${rowCount} row(s)`);
          }
        }
      } catch (err) {
        console.error('✖︎ Error executing script:', err.message || err);
      }
    }

    // 4) Run your schema (tables → data) in correct sequence
    await executeSQLScript(pool, path.join(__dirname, 'Schema.sql'));

    // Test connection
    try {
      const conn = await pool.getConnection();
      console.log('Connected to MySQL database!');
      conn.release();
    } catch (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }

    // -- Converted all handlers to use async/await with the promise pool --
    // Get all organizations
    app.get('/organizations', async (req, res) => {
      try {
        const [results] = await pool.query('SELECT * FROM Organizations');
        res.json(results);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        res.status(500).json({ error: 'Failed to fetch organizations' });
      }
    });

    // Get a specific organization by ID
    app.get('/organizations/:id', async (req, res) => {
      const organizationId = req.params.id;
      try {
        const [results] = await pool.query('SELECT * FROM Organizations WHERE OrganizationID = ?', [organizationId]);
        if (results.length === 0) return res.status(404).json({ message: 'Organization not found' });
        res.json(results[0]);
      } catch (err) {
        console.error('Error fetching organization:', err);
        res.status(500).json({ error: 'Failed to fetch organization' });
      }
    });

    // Create a new organization
    app.post('/organizations', async (req, res) => {
      const { Name, Type, Description } = req.body;
      try {
        const [result] = await pool.query('INSERT INTO Organizations (Name, Type, Description) VALUES (?, ?, ?)', [Name, Type, Description]);
        res.status(201).json({ message: 'Organization created', organizationId: result.insertId });
      } catch (err) {
        console.error('Error creating organization:', err);
        res.status(500).json({ error: 'Failed to create organization' });
      }
    });

    // Update an existing organization
    app.put('/organizations/:id', async (req, res) => {
      const organizationId = req.params.id;
      const { Name, Type, Description } = req.body;
      try {
        const [result] = await pool.query('UPDATE Organizations SET Name = ?, Type = ?, Description = ? WHERE OrganizationID = ?', [Name, Type, Description, organizationId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Organization not found' });
        res.json({ message: 'Organization updated' });
      } catch (err) {
        console.error('Error updating organization:', err);
        res.status(500).json({ error: 'Failed to update organization' });
      }
    });

    // Delete an organization
    app.delete('/organizations/:id', async (req, res) => {
      const organizationId = req.params.id;
      try {
        const [result] = await pool.query('DELETE FROM Organizations WHERE OrganizationID = ?', [organizationId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Organization not found' });
        res.json({ message: 'Organization deleted' });
      } catch (err) {
        console.error('Error deleting organization:', err);
        res.status(500).json({ error: 'Failed to delete organization' });
      }
    });

    // Projects - single handler returning AR/AP (clients + receipts)
    app.get('/projects', async (req, res) => {
      try {
        const organizationId = req.query.organizationId;
        let query = `
          SELECT
            p.ProjectID,
            p.Name AS ProjectName,
            p.Status,
            p.StartDate,
            p.EndDate,
            p.Budget,
            p.Spending,
            p.Description,
            d.DepartmentID,
            d.Name AS DepartmentName,
            d.OrganizationID,
            -- AR = contracted clients + receipts/income recorded in Transactions
            (SELECT IFNULL(SUM(c.ContractAmount),0) FROM Clients c WHERE c.ProjectID = p.ProjectID)
              + (SELECT IFNULL(SUM(t.Amount),0) FROM Transactions t WHERE t.ProjectID = p.ProjectID AND t.Type IN ('Receipt','Income')) AS AR,
            -- AP from Transactions (expenses)
            (SELECT IFNULL(SUM(t2.Amount),0) FROM Transactions t2 WHERE t2.ProjectID = p.ProjectID AND t2.Type = 'Expense') AS AP
          FROM Projects p
          LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
        `;
        const params = [];
        if (organizationId) {
          query += ` WHERE d.OrganizationID = ?`;
          params.push(organizationId);
        }
        query += ` ORDER BY p.ProjectID DESC`;
        const [rows] = await pool.query(query, params);
        res.json(rows);
      } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
      }
    });

    // Create project (robust: accept Name or ProjectName, DepartmentID or OrganizationID fallback)
    app.post('/projects', async (req, res) => {
      try {
        // accept multiple possible keys from frontend
        const {
          Name, ProjectName, name: nameLower,
          DepartmentID, DepartmentId, departmentId,
          OrganizationID, OrganizationId, organizationId,
          StartDate, EndDate, Budget, Status, Spending
        } = req.body;

        const projectName = Name || ProjectName || nameLower || null;
        let deptId = DepartmentID || DepartmentId || departmentId || null;
        const orgId = OrganizationID || OrganizationId || organizationId || null;

        if (!projectName) return res.status(400).json({ error: 'Project name is required (Name or ProjectName).' });

        // If no DepartmentID but OrganizationID provided, ensure an "Unassigned" department exists and use it
        if (!deptId && orgId) {
          const [rows] = await pool.query('SELECT DepartmentID FROM Departments WHERE OrganizationID = ? AND Name = ? LIMIT 1', [orgId, 'Unassigned']);
          if (rows && rows.length > 0) {
            deptId = rows[0].DepartmentID;
          } else {
            const [ins] = await pool.query('INSERT INTO Departments (OrganizationID, Name, Description) VALUES (?, ?, ?)', [orgId, 'Unassigned', 'Auto-created department for unassigned projects']);
            deptId = ins.insertId;
          }
        }

        if (!deptId) return res.status(400).json({ error: 'DepartmentID is required (or provide OrganizationID to auto-create an Unassigned department).' });

        const insertQuery = `
          INSERT INTO Projects (Name, DepartmentID, StartDate, EndDate, Budget, Status, Spending)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertQuery, [
          projectName,
          deptId,
          StartDate || null,
          EndDate || null,
          (Budget === undefined || Budget === null) ? null : Budget,
          Status || 'Not Started',
          (Spending === undefined || Spending === null) ? 0 : Spending
        ]);

        res.status(201).json({ message: 'Project created', projectId: result.insertId });
      } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ error: 'Failed to create project' });
      }
    });

    // Update project (PUT) - partial updates supported, returns updated row
    app.put('/projects/:id', async (req, res) => {
      const projectId = req.params.id;
      try {
        // Accept multiple possible keys from frontend
        let {
          Name,
          ProjectName,
          name: nameLower,
          DepartmentID,
          DepartmentId,
          departmentId,
          OrganizationID,
          OrganizationId,
          organizationId,
          StartDate,
          EndDate,
          Budget,
          Spending,
          Status,
          Description
        } = req.body;

        const projectName = Name || ProjectName || nameLower;
        let deptId = DepartmentID || DepartmentId || departmentId || null;
        const orgId = OrganizationID || OrganizationId || organizationId || null;

        // If DepartmentID is not provided but OrganizationID is, ensure Unassigned exists and use it
        if (!deptId && orgId) {
          const [rows] = await pool.query('SELECT DepartmentID FROM Departments WHERE OrganizationID = ? AND Name = ? LIMIT 1', [orgId, 'Unassigned']);
          if (rows && rows.length > 0) {
            deptId = rows[0].DepartmentID;
          } else {
            const [ins] = await pool.query('INSERT INTO Departments (OrganizationID, Name, Description) VALUES (?, ?, ?)', [orgId, 'Unassigned', 'Auto-created department for unassigned projects']);
            deptId = ins.insertId;
          }
        }

        // Build dynamic SET clause so caller can update any subset of fields
        const sets = [];
        const params = [];

        if (projectName !== undefined) {
          sets.push('Name = ?');
          params.push(projectName);
        }
        if (deptId !== undefined && deptId !== null) {
          sets.push('DepartmentID = ?');
          params.push(deptId);
        }
        if (StartDate !== undefined) {
          sets.push('StartDate = ?');
          params.push(StartDate || null);
        }
        if (EndDate !== undefined) {
          sets.push('EndDate = ?');
          params.push(EndDate || null);
        }
        if (Budget !== undefined) {
          sets.push('Budget = ?');
          params.push(Budget === null ? null : Budget);
        }
        if (Spending !== undefined) {
          sets.push('Spending = ?');
          params.push(Spending === null ? 0 : Spending);
        }
        if (Status !== undefined) {
          sets.push('Status = ?');
          params.push(Status);
        }
        if (Description !== undefined) {
          sets.push('Description = ?');
          params.push(Description);
        }

        if (sets.length === 0) {
          return res.status(400).json({ error: 'No updatable fields provided' });
        }

        const sql = `UPDATE Projects SET ${sets.join(', ')} WHERE ProjectID = ?`;
        params.push(projectId);

        const [updateResult] = await pool.query(sql, params);
        if (updateResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Return the updated project with department info
        const [rows] = await pool.query(
          `SELECT p.ProjectID, p.Name AS ProjectName, p.Status, p.StartDate, p.EndDate, p.Budget, p.Spending, p.Description,
                  d.DepartmentID, d.Name AS DepartmentName, d.OrganizationID
           FROM Projects p
           LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
           WHERE p.ProjectID = ?`,
          [projectId]
        );

        res.json(rows[0] || { message: 'Project updated' });
      } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ error: 'Failed to update project' });
      }
    });

    // Delete project
    app.delete('/projects/:id', async (req, res) => {
      const projectId = req.params.id;
      const query = `DELETE FROM Projects WHERE ProjectID = ?`;
      try {
        const [result] = await pool.query(query, [projectId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Project not found' });
        res.json({ message: 'Project deleted' });
      } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ error: 'Failed to delete project' });
      }
    });

    // Get clients for a project
    app.get('/clients', async (req, res) => {
      const projectId = req.query.projectId;
      if (!projectId) return res.status(400).json({ error: 'Project ID is required' });
      const query = `
        SELECT
          ClientID,
          Name,
          ContactDetails,
          ContractAmount,
          PurchaseDate
        FROM Clients
        WHERE ProjectID = ?
      `;
      try {
        const [results] = await pool.query(query, [projectId]);
        res.json(results);
      } catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ error: 'Failed to fetch clients' });
      }
    });

    // Get departments for an organization
    app.get('/departments', async (req, res) => {
      const organizationId = req.query.organizationId;
      if (!organizationId) return res.status(400).json({ error: 'Organization ID is required' });
      const query = `
        SELECT
          DepartmentID,
          Name
        FROM Departments
        WHERE OrganizationID = ?
      `;
      try {
        const [results] = await pool.query(query, [organizationId]);
        res.json(results);
      } catch (err) {
        console.error('Error fetching departments:', err);
        res.status(500).json({ error: 'Failed to fetch departments' });
      }
    });

    // Organization dashboard: counts and sums (projects, departments, clients, budget/spending)
    app.get('/organizations/:id/dashboard', async (req, res) => {
      const orgId = req.params.id;
      try {
        const query = `
          SELECT
            (SELECT COUNT(*) FROM Departments WHERE OrganizationID = ?) AS departmentsCount,
            (SELECT COUNT(*) FROM Projects p JOIN Departments d ON p.DepartmentID = d.DepartmentID WHERE d.OrganizationID = ?) AS projectsCount,
            (SELECT COUNT(*) FROM Clients c
               JOIN Projects p2 ON c.ProjectID = p2.ProjectID
               JOIN Departments d2 ON p2.DepartmentID = d2.DepartmentID
             WHERE d2.OrganizationID = ?) AS clientsCount,
            (SELECT IFNULL(SUM(p3.Budget),0) FROM Projects p3 JOIN Departments d3 ON p3.DepartmentID = d3.DepartmentID WHERE d3.OrganizationID = ?) AS totalBudget,
            (SELECT IFNULL(SUM(p4.Spending),0) FROM Projects p4 JOIN Departments d4 ON p4.DepartmentID = d4.DepartmentID WHERE d4.OrganizationID = ?) AS totalSpending,
            -- total amount contracted by clients (A/R)
            (SELECT IFNULL(SUM(c2.ContractAmount),0) FROM Clients c2
               JOIN Projects p5 ON c2.ProjectID = p5.ProjectID
               JOIN Departments d5 ON p5.DepartmentID = d5.DepartmentID
             WHERE d5.OrganizationID = ?) AS totalAR,
            -- total payables approximation (use Project.Spending as A/P)
            (SELECT IFNULL(SUM(p6.Spending),0) FROM Projects p6 JOIN Departments d6 ON p6.DepartmentID = d6.DepartmentID WHERE d6.OrganizationID = ?) AS totalAP
        `;
        const params = [orgId, orgId, orgId, orgId, orgId, orgId, orgId];
        const [rows] = await pool.query(query, params);
        const r = rows && rows[0] ? rows[0] : {};
        // normalize numeric fields
        res.json({
          departmentsCount: Number(r.departmentsCount || 0),
          projectsCount: Number(r.projectsCount || 0),
          clientsCount: Number(r.clientsCount || 0),
          totalBudget: Number(r.totalBudget || 0),
          totalSpending: Number(r.totalSpending || 0),
          totalAR: Number(r.totalAR || 0),
          totalAP: Number(r.totalAP || 0),
        });
      } catch (err) {
        console.error('Error fetching organization dashboard:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
      }
    });

    // Get projects (optionally filter by organizationId) — single handler returning AR/AP
    app.get('/projects', async (req, res) => {
      try {
        const organizationId = req.query.organizationId;
        let query = `
          SELECT
            p.ProjectID,
            p.Name AS ProjectName,
            p.Status,
            p.StartDate,
            p.EndDate,
            p.Budget,
            p.Spending,
            p.Description,
            d.DepartmentID,
            d.Name AS DepartmentName,
            d.OrganizationID,
            -- AR: clients contract amounts + receipts/income from Transactions
            (SELECT IFNULL(SUM(c.ContractAmount),0) FROM Clients c WHERE c.ProjectID = p.ProjectID)
              + (SELECT IFNULL(SUM(t.Amount),0) FROM Transactions t WHERE t.ProjectID = p.ProjectID AND t.Type IN ('Receipt','Income')) AS AR,
            -- AP from Transactions (expenses)
            (SELECT IFNULL(SUM(t2.Amount),0) FROM Transactions t2 WHERE t2.ProjectID = p.ProjectID AND t2.Type = 'Expense') AS AP
          FROM Projects p
          LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
        `;
        const params = [];
        if (organizationId) {
          query += ` WHERE d.OrganizationID = ?`;
          params.push(organizationId);
        }
        query += ` ORDER BY p.ProjectID DESC`;
        const [rows] = await pool.query(query, params);
        res.json(rows);
      } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
      }
    });

    // Create new project
    app.get('/projects', async (req, res) => {
      try {
        const organizationId = req.query.organizationId;
        let query = `
          SELECT
            p.ProjectID,
            p.Name AS ProjectName,
            p.Status,
            p.StartDate,
            p.EndDate,
            p.Budget,
            p.Spending,
            p.Description,
            d.DepartmentID,
            d.Name AS DepartmentName,
            d.OrganizationID,
            -- Accounts Receivable: clients contract amounts + receipts recorded in Transactions
            (SELECT IFNULL(SUM(c.ContractAmount),0) FROM Clients c WHERE c.ProjectID = p.ProjectID) 
              + (SELECT IFNULL(SUM(t.Amount),0) FROM Transactions t WHERE t.ProjectID = p.ProjectID AND t.Type IN ('Receipt','Income')) 
              AS AR,
            -- optional: AP derived from Transactions (expenses) if you prefer over p.Spending
            (SELECT IFNULL(SUM(t2.Amount),0) FROM Transactions t2 WHERE t2.ProjectID = p.ProjectID AND t2.Type = 'Expense') AS AP_from_txn
          FROM Projects p
          LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
        `;
        const params = [];
        if (organizationId) {
          query += ` WHERE d.OrganizationID = ?`;
          params.push(organizationId);
        }
        query += ` ORDER BY p.ProjectID DESC`;
        const [rows] = await pool.query(query, params);
        res.json(rows);
      } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
      }
    });

    // Get transactions for a project
    app.get('/transactions', async (req, res) => {
      const projectId = req.query.projectId;
      if (!projectId) return res.status(400).json({ error: 'Project ID is required' });
      try {
        const [results] = await pool.query(
          `SELECT TxnID, ProjectID, TxnDate, Category, ExpenseType, Item,  Note, Amount
           FROM Transactions
           WHERE ProjectID = ?`,
          [projectId]
        );
        res.json(results);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ error: 'Failed to fetch transactions' });
      }
    });

    // Create a new transaction (expense or receipt). If Expense, update project Spending.
    app.post('/transactions', async (req, res) => {
      try {
        const {
          ProjectID,
          TxnDate,
          Category,
          ExpenseType, // 'Expense' or 'Receipt'
          Item,
          
          Note,
          Amount
        } = req.body;

        if (!ProjectID) return res.status(400).json({ error: 'ProjectID is required' });
        if (Amount === undefined || Amount === null) return res.status(400).json({ error: 'Amount is required' });

        const insertSql = `
          INSERT INTO Transactions (ProjectID, TxnDate, Category, ExpenseType, Item, Note, Amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          ProjectID,
          TxnDate || new Date().toISOString().slice(0,10),
          Category || 'Uncategorized',
          ExpenseType || 'Expense',
          Item || null,
          Note || null,
          Number(Amount)
        ];
        const [result] = await pool.query(insertSql, params);
        const insertedId = result.insertId;

        // If this is an Expense, update Projects.Spending by adding the amount
        let updatedSpending = null;
        if ((ExpenseType || 'Expense').toLowerCase() === 'expense') {
          await pool.query('UPDATE Projects SET Spending = IFNULL(Spending,0) + ? WHERE ProjectID = ?', [Number(Amount), ProjectID]);
          const [rows] = await pool.query('SELECT IFNULL(Spending,0) AS Spending FROM Projects WHERE ProjectID = ?', [ProjectID]);
          updatedSpending = rows && rows[0] ? Number(rows[0].Spending) : null;
        }

        // Return the created transaction
        const [rows2] = await pool.query('SELECT TxnID, ProjectID, TxnDate, Category, ExpenseType, Item,  Note, Amount FROM Transactions WHERE TxnID = ?', [insertedId]);
        res.status(201).json({
          message: 'Transaction created',
          transaction: rows2 && rows2[0] ? rows2[0] : null,
          updatedSpending
        });
      } catch (err) {
        console.error('Error creating transaction:', err);
        res.status(500).json({ error: 'Failed to create transaction' });
      }
    });

    // Add this helper function
    function excelDateToJSDate(serial) {
      if (serial === null || serial === undefined) return null;
      const num = Number(serial);
      if (!Number.isNaN(num)) {
        const utc_days = Math.floor(num - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toISOString().slice(0, 10);
      }
      const parsed = new Date(serial);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
      return null;
    }

    // Import transactions with column mapping
    app.post('/import-transactions', async (req, res) => {
      const { rows, uploaderEmail, fileName, organizationId, columnMap } = req.body;
      if (!Array.isArray(rows)) return res.status(400).json({ error: 'Rows array required' });

      await pool.query(
        `INSERT INTO AuditUploads (UploaderEmail, FileName, RowCount, OrganizationID) VALUES (?, ?, ?, ?)`,
        [uploaderEmail || 'unknown', fileName || '', rows.length, organizationId || null]
      );

      let inserted = 0;
      for (const row of rows) {
        try {
          const dbRow = {};
          Object.keys(columnMap).forEach(dbField => {
            dbRow[dbField] = row[columnMap[dbField]] || null;
          });
          console.log('Inserting row:', dbRow);

          const txnDateRaw = dbRow.TxnDate || null;
          const txnDate = excelDateToJSDate(txnDateRaw) || null;

          await pool.query(
            `INSERT INTO ImportedTransactions
            (OrganizationID, OrgName, TxnID, TxnDate, Category, Item, Type, Amount, ProjectID, ProjectName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              dbRow.OrganizationID || organizationId || null,
              dbRow.OrgName || null,
              dbRow.TxnID || null,
              txnDate,
              dbRow.Category || null,
              dbRow.Item || null,
              dbRow.Type || null,
              dbRow.Amount || 0,
              dbRow.ProjectID || null,
              dbRow.ProjectName || null
            ]
          );
          inserted++;
        } catch (err) {
          console.error('Failed to insert row:', err);
        }
      }
      res.json({ message: `Imported ${inserted} transactions.` });
    });

    // Get all imported transactions
    app.get('/imported-transactions', async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM ImportedTransactions');
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch imported transactions' });
      }
    });

    // Project financials summary
    app.get('/project-financials', async (req, res) => {
      try {
        const [rows] = await pool.query(`
          SELECT
            ProjectID,
            ProjectName,
            SUM(CASE WHEN LOWER(Type) IN ('income', 'receipt') THEN Amount ELSE 0 END) AS AR,
            SUM(CASE WHEN LOWER(Type) = 'expense' THEN Amount ELSE 0 END) AS AP
          FROM ImportedTransactions
          WHERE ProjectID IS NOT NULL
          GROUP BY ProjectID, ProjectName
          ORDER BY ProjectID DESC
        `);
        const projects = rows.map(p => ({
          ProjectID: p.ProjectID,
          ProjectName: p.ProjectName,
          AR: Number(p.AR || 0),
          AP: Number(p.AP || 0),
          Profit: Number(p.AR || 0) - Number(p.AP || 0),
          Loss: Number(p.AR || 0) - Number(p.AP || 0) < 0 ? Math.abs(Number(p.AR || 0) - Number(p.AP || 0)) : 0
        }));
        res.json(projects);
      } catch (err) {
        console.error('Error fetching project financials:', err);
        res.status(500).json({ error: 'Failed to fetch project financials' });
      }
    });

    // Login API
    app.post('/login', async (req, res) => {
      const { email, password } = req.body;
      try {
        const [users] = await pool.query('SELECT * FROM Users WHERE Email = ?', [email]);
        if (!users.length) return res.status(401).json({ error: 'Invalid credentials' });

        const user = users[0];
        const match = await bcrypt.compare(password, user.Password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        // Only return safe fields
        res.json({
          UserID: user.UserID,
          Email: user.Email,
          Name: user.Name,
          OrganizationID: user.OrganizationID
        });
      } catch (err) {
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
);