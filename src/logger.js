function logEvent(event, details = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...details
    })
  );
}

function logError(event, error, details = {}) {
  logEvent(event, {
    ...details,
    error: error instanceof Error ? error.message : String(error)
  });
}

module.exports = {
  logEvent,
  logError
};
