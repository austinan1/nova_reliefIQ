/**
 * Capitalize district name properly (title case)
 * Converts "kathmandu" to "Kathmandu" or "sindhupalchok" to "Sindhupalchok"
 */
export const capitalizeDistrictName = (name) => {
  if (!name) return ''
  // Split by spaces and capitalize each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

