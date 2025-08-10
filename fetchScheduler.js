const { fetchLatestFromDB } = require('./controllers/databaseController');

const THIRTY_MIN_MS = 30 * 60 * 1000;

function startDatabasePolling(intervalMs = 5 * 60 * 1000) {
    console.log(`[DB] Polling every ${intervalMs / 1000} seconds`);
  
    const run = async () => {
      try {
        const docs = await fetchLatestFromDB();
        // You can process docs here, push to Google Sheets, etc.
      } catch (err) {
        console.error('[DB] fetch error:', err.message);
      }
    };
  
    run(); // run once immediately
    setInterval(run, intervalMs);
  }

module.exports = { startDatabasePolling };