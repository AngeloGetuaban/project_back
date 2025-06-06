const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

exports.getAllCSVs = (req, res) => {
  const contractsDir = path.join(__dirname, '..', 'database');
  const responseData = {};

  fs.readdir(contractsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read database directory', details: err.message });
    }

    // Filter for .csv files only
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    let filesProcessed = 0;

    if (csvFiles.length === 0) {
      return res.json({ message: 'No CSV files found.' });
    }

    csvFiles.forEach((file) => {
      const filePath = path.join(contractsDir, file);
      const results = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          responseData[file] = results;
          filesProcessed++;

          if (filesProcessed === csvFiles.length) {
            res.json(responseData);
          }
        })
        .on('error', (error) => {
          responseData[file] = { error: error.message };
          filesProcessed++;

          if (filesProcessed === csvFiles.length) {
            res.json(responseData);
          }
        });
    });
  });
};
