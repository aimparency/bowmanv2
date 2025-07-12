export function humanizeAmount(n: number) {
  // Simplified version for git-based system - just format numbers nicely
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M'
  } else if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'K'
  } else {
    return n.toString()
  }
}
