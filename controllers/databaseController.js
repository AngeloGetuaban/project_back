const admin = require('../firebase-admin');
const { sheets, drive } = require('../googleClient');
const csv = require('csv-parser');
const stream = require('stream');

// Folder ID for your Google Drive target
const FOLDER_ID = '1YH_YdGQbuRQt5RCz8JHSEuvtoPV9r6Mx';

exports.getAllDatabases = async (req, res) => {
  try {
    const driveRes = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
    });

    const files = driveRes.data.files;

    const snapshot = await admin.firestore().collection('database').get();
    const firestoreData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const result = files.map(sheet => {
      const metadata = firestoreData.find(f => f.sheet_id === sheet.id) || {};
      return {
        ...sheet,
        ...metadata,
      };
    });

    res.status(200).json({ sheets: result });
  } catch (err) {
    console.error('Error fetching sheets:', err.message);
    res.status(500).json({ message: 'Failed to retrieve sheets', error: err.message });
  }
};

// ➕ Create or reuse Google Sheet file by department_name
exports.createDatabase = async (req, res) => {
  try {
    const {
      database_name,
      department_name,
      created_by,
      database_password,
      columns = [],
    } = req.body;

    if (!database_name || !department_name || !database_password || !created_by) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let fileId = null;
    let spreadsheetUrl = '';

    // 🔍 1. Search if file with department_name already exists in Drive
    const searchRes = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and name='${department_name}' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
    });

    if (searchRes.data.files.length > 0) {
      // 📄 File exists
      fileId = searchRes.data.files[0].id;
      spreadsheetUrl = searchRes.data.files[0].webViewLink;
    } else {
      // 📁 Create new file
      const fileRes = await sheets.spreadsheets.create({
        resource: {
          properties: { title: department_name },
        },
        fields: 'spreadsheetId,spreadsheetUrl',
      });

      fileId = fileRes.data.spreadsheetId;
      spreadsheetUrl = fileRes.data.spreadsheetUrl;

      // 📦 Move to Drive folder
      await drive.files.update({
        fileId,
        addParents: FOLDER_ID,
        removeParents: '',
        fields: 'id, parents',
      });
    }

    // ✅ 2. Create a new sheet inside the file
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: fileId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: database_name,
              },
            },
          },
        ],
      },
    });

    // ✍️ 3. Add column headers to new sheet
    if (columns.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: fileId,
        range: `${database_name}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [columns],
        },
      });
    }

    // 🗃️ 4. Store metadata in Firestore
    const now = admin.firestore.FieldValue.serverTimestamp();

    await admin.firestore().collection('database').add({
      database_name,
      department_name,
      created_by,
      database_password,
      columns,
      sheet_id: fileId,
      sheet_url: spreadsheetUrl,
      is_active: true,
      sync_status: 'idle',
      created_at: now,
      updated_at: now,
    });

    return res.status(201).json({
      message: 'Database sheet created successfully',
      sheet_id: fileId,
      sheet_url: spreadsheetUrl,
    });
  } catch (err) {
    console.error('Error creating sheet/database:', err.message);
    return res.status(500).json({ message: 'Failed to create sheet', error: err.message });
  }
};


// 📤 Append rows via CSV upload to a specific tab (database_name)
exports.uploadCsvToSheet = async (req, res) => {
  try {
    const { sheet_id, database_name } = req.body;

    if (!req.file || !sheet_id || !database_name) {
      return res.status(400).json({ message: 'Missing file, sheet_id or database_name' });
    }

    const rows = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
      .pipe(csv())
      .on('data', row => rows.push(Object.values(row)))
      .on('end', async () => {
        try {
          await sheets.spreadsheets.values.append({
            spreadsheetId: sheet_id,
            range: `${database_name}!A1`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: rows },
          });

          return res.status(200).json({ message: 'CSV rows appended successfully' });
        } catch (appendErr) {
          console.error('Append error:', appendErr.message);
          return res.status(500).json({ message: 'Failed to append CSV rows', error: appendErr.message });
        }
      })
      .on('error', parseErr => {
        console.error('CSV parse error:', parseErr.message);
        res.status(500).json({ message: 'CSV parse error', error: parseErr.message });
      });
  } catch (err) {
    console.error('CSV upload handler error:', err.message);
    res.status(500).json({ message: 'Failed to upload CSV', error: err.message });
  }
};

// POST /api/database/confirm-password
// controllers/databaseController.js
exports.confirmPassword = async (req, res) => {
  const { sheet_id, input_password } = req.body;

  if (!sheet_id || !input_password) {
    return res.status(400).json({ message: 'Missing sheet_id or input_password' });
  }

  const snapshot = await admin.firestore()
    .collection('database')
    .where('sheet_id', '==', sheet_id)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return res.status(404).json({ message: 'Sheet not found' });
  }

  const doc = snapshot.docs[0];
  const db = doc.data();

  if (db.database_password !== input_password) {
    return res.status(401).json({ message: 'Incorrect password' });
  }

  return res.status(200).json({ message: 'Access granted' });
};

exports.getSheetData = async (req, res) => {
  try {
    const { sheet_id } = req.params;

    if (!sheet_id) {
      return res.status(400).json({ message: 'Missing sheet_id' });
    }

    // Look up the database record to get the tab name
    const snapshot = await admin.firestore()
      .collection('database')
      .where('sheet_id', '==', sheet_id)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Sheet not found in Firestore' });
    }

    const sheetDoc = snapshot.docs[0].data();
    const tabName = sheetDoc.database_name;

    // No fixed range like A1:Z1000 — just use the sheet name to fetch all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet_id,
      range: `${tabName}`, // fetches all available data in the sheet
    });

    const [headers, ...rows] = response.data.values || [];

    if (!headers) return res.status(200).json([]);

    const jsonRows = rows.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    res.status(200).json(jsonRows);
  } catch (err) {
    console.error('Error fetching sheet data:', err.message);
    res.status(500).json({ message: 'Failed to fetch sheet data', error: err.message });
  }
};
