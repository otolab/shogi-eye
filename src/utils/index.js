

function addCanvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.setAttribute('width', width)
    canvas.setAttribute('height', height)
    // canvas.style.display = 'none';
    // document.body.appendChild(canvas)
    return canvas
}

const canvases = {}


export function getCanvas(w, h, idx) {
  const name = idx ? idx : `${w}x${h}`

  if (name in canvases) return canvases[name];

  canvases[name] = addCanvas(w, h)    

  return canvases[name]
}


export function getCtx(width, height) {
  const canvas = getCanvas(width, height)
  // canvas.style.display = 'none'

  return canvas.getContext('2d')
}