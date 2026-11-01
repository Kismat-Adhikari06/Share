export function measureBlocks(container) {
  if (!container) return []

  return Array.from(container.children).map((child) => {
    const style = getComputedStyle(child)
    return {
      height: child.getBoundingClientRect().height,
      marginTop: Number.parseFloat(style.marginTop) || 0,
      marginBottom: Number.parseFloat(style.marginBottom) || 0,
    }
  })
}

export function paginateBlocks(blocks, metrics, maxHeight) {
  if (!blocks.length) return [[]]

  const pages = []
  let current = []
  let used = 0

  blocks.forEach((block, index) => {
    const metric = metrics[index] || { height: 48, marginTop: 0, marginBottom: 0 }
    const height = metric.height + metric.marginTop + metric.marginBottom

    if (current.length && used + height > maxHeight) {
      pages.push(current)
      current = []
      used = 0
    }

    current.push(block)
    used += height
  })

  if (current.length) pages.push(current)
  return pages.length ? pages : [[]]
}
