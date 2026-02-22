// --- Helper functions ---
function formatNumber(num) {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString();
}

function formatDate(dateString, includeTimezone = false) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    let formatted = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    if (includeTimezone) {
      const timezoneMatch = dateString.match(/GMT|UTC|[A-Z]{3}$/i);
      if (timezoneMatch) formatted += ` ${timezoneMatch[0].toUpperCase()}`;
    }
    return formatted;
  } catch {
    return dateString;
  }
}

export { formatNumber, formatDate };