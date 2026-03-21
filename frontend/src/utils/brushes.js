// ─── Utility ───────────────────────────────────────────────────────────────

export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Separable box blur — O(n·r) instead of O(n·r²)
export function boxBlur(imageData, radius) {
  const { data, width, height } = imageData
  const tmp = new Float32Array(data)
  const out = new ImageData(width, height)

  // Horizontal pass on `data` → `tmp`
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, cnt = 0
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.min(width - 1, Math.max(0, x + dx))
        const i = (y * width + nx) * 4
        r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]
        cnt++
      }
      const i = (y * width + x) * 4
      tmp[i] = r / cnt; tmp[i + 1] = g / cnt; tmp[i + 2] = b / cnt; tmp[i + 3] = a / cnt
    }
  }

  // Vertical pass on `tmp` → `out`
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, cnt = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.min(height - 1, Math.max(0, y + dy))
        const i = (ny * width + x) * 4
        r += tmp[i]; g += tmp[i + 1]; b += tmp[i + 2]; a += tmp[i + 3]
        cnt++
      }
      const i = (y * width + x) * 4
      out.data[i] = r / cnt; out.data[i + 1] = g / cnt; out.data[i + 2] = b / cnt; out.data[i + 3] = a / cnt
    }
  }

  return out
}

// ─── Brushes ───────────────────────────────────────────────────────────────

// Soft overlapping radial-gradient blobs with random jitter
export function drawWatercolor(ctx, x, y, color, size, opacity) {
  const numBlobs = 16
  for (let i = 0; i < numBlobs; i++) {
    const jx = x + (Math.random() - 0.5) * size * 2.0
    const jy = y + (Math.random() - 0.5) * size * 2.0
    const r  = size * (0.25 + Math.random() * 0.75)
    const grad = ctx.createRadialGradient(jx, jy, 0, jx, jy, r)
    grad.addColorStop(0,   hexToRgba(color, opacity * 0.38))
    grad.addColorStop(0.5, hexToRgba(color, opacity * 0.15))
    grad.addColorStop(1,   hexToRgba(color, 0))
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(jx, jy, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Thin line + graphite grain scatter
// fromX/fromY: prevMid, ctrlX/ctrlY: actual prev pos (control), toX/toY: currentMid
export function drawPencil(ctx, fromX, fromY, ctrlX, ctrlY, toX, toY, color, size, opacity) {
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(0.5, size * 0.3)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.quadraticCurveTo(ctrlX, ctrlY, toX, toY)
  ctx.stroke()
  ctx.globalAlpha = 1
}

// Smooth quadratic curves; width scales inversely with speed (fast→thin, slow→thick)
// fromX/fromY: prevMid, ctrlX/ctrlY: actual prev pos (control), toX/toY: currentMid
export function drawInk(ctx, fromX, fromY, ctrlX, ctrlY, toX, toY, color, size, opacity, speed) {
  const speedRatio = Math.min(speed / 1.5, 1) // 1.5 px/ms = "fast"
  const width = Math.max(0.5, size * (0.12 + (1 - speedRatio) * 0.88))
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.quadraticCurveTo(ctrlX, ctrlY, toX, toY)
  ctx.stroke()
  ctx.globalAlpha = 1
}

// Sample prev position pixels → box-blur → repaint offset toward stroke direction.
// Uses a circular feathered mask so the smear has a soft round edge instead of a square blob.
export function drawSmudge(ctx, x, y, prevX, prevY, size) {
  const r = Math.min(Math.floor(size * 0.9), 55)
  if (r < 2) return
  const sx = Math.floor(prevX - r)
  const sy = Math.floor(prevY - r)
  const sw = r * 2
  const sh = r * 2
  try {
    const imageData = ctx.getImageData(sx, sy, sw, sh)
    const blurred   = boxBlur(imageData, 3)

    // Draw blurred pixels to a temp canvas, then apply a radial falloff mask
    const tmp  = document.createElement('canvas')
    tmp.width  = sw
    tmp.height = sh
    const tctx = tmp.getContext('2d')
    tctx.putImageData(blurred, 0, 0)

    // Circular feathering: destination-in with radial gradient fades the square edges
    tctx.globalCompositeOperation = 'destination-in'
    const grad = tctx.createRadialGradient(r, r, 0, r, r, r)
    grad.addColorStop(0,   'rgba(0,0,0,1)')
    grad.addColorStop(0.6, 'rgba(0,0,0,0.85)')
    grad.addColorStop(1,   'rgba(0,0,0,0)')
    tctx.fillStyle = grad
    tctx.fillRect(0, 0, sw, sh)

    const dx = (x - prevX) * 0.55
    const dy = (y - prevY) * 0.55
    ctx.drawImage(tmp, sx + dx, sy + dy)
  } catch { /* tainted or OOB */ }
}

// Sample pixels under cursor, apply box blur, put back — softens whatever is under
export function drawBlur(ctx, x, y, size) {
  const r = Math.min(Math.floor(size * 0.9), 55)
  if (r < 2) return
  const sx = Math.floor(x - r)
  const sy = Math.floor(y - r)
  const sw = r * 2
  const sh = r * 2
  try {
    const imageData = ctx.getImageData(sx, sy, sw, sh)
    const blurred = boxBlur(imageData, 4)
    ctx.putImageData(blurred, sx, sy)
  } catch { /* tainted or OOB */ }
}

// Pixel-level soft erase via destination-out radial gradient
export function drawEraser(ctx, x, y, size) {
  ctx.globalCompositeOperation = 'destination-out'
  const grad = ctx.createRadialGradient(x, y, 0, x, y, size)
  grad.addColorStop(0,    'rgba(0,0,0,1)')
  grad.addColorStop(0.6,  'rgba(0,0,0,0.9)')
  grad.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
}
