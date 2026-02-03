export const TEXTURE_SIZE = 256

const makeBrickTexture = (textureSize: number) => {
  const tex = document.createElement('canvas')
  tex.width = textureSize
  tex.height = textureSize
  const tctx = tex.getContext('2d')
  if (!tctx) return tex
  tctx.imageSmoothingEnabled = true
  tctx.fillStyle = '#3d2a24'
  tctx.fillRect(0, 0, textureSize, textureSize)
  tctx.strokeStyle = '#5a3a2f'
  tctx.lineWidth = 3
  const rowHeight = 40
  const brickWidth = 52
  for (let y = 0; y < textureSize; y += rowHeight) {
    const offset = (y / rowHeight) % 2 === 0 ? 0 : brickWidth / 2
    for (let x = -offset; x < textureSize; x += brickWidth) {
      tctx.strokeRect(x + 1, y + 1, brickWidth - 2, rowHeight - 2)
    }
  }
  return tex
}

const makeTextTexture = (textureSize: number, title: string, lines: string[]) => {
  const tex = document.createElement('canvas')
  tex.width = textureSize
  tex.height = textureSize
  const tctx = tex.getContext('2d')
  if (!tctx) return tex
  tctx.imageSmoothingEnabled = true
  tctx.fillStyle = '#0b1016'
  tctx.fillRect(0, 0, textureSize, textureSize)
  tctx.strokeStyle = '#6bdcff'
  tctx.lineWidth = 4
  tctx.strokeRect(6, 6, textureSize - 12, textureSize - 12)
  tctx.fillStyle = '#6bdcff'
  tctx.font = 'bold 28px "Geist Mono", monospace'
  tctx.fillText(title, 18, 42)
  tctx.fillStyle = '#d7f7ff'
  tctx.font = '22px "Geist Mono", monospace'
  lines.forEach((line, i) => {
    tctx.fillText(line, 18, 86 + i * 30)
  })
  return tex
}

const makeFloorTexture = (textureSize: number) => {
  const tex = document.createElement('canvas')
  tex.width = textureSize
  tex.height = textureSize
  const tctx = tex.getContext('2d')
  if (!tctx) return tex
  tctx.imageSmoothingEnabled = true
  tctx.fillStyle = '#3b3a36'
  tctx.fillRect(0, 0, textureSize, textureSize)
  const tile = 32
  for (let y = 0; y < textureSize; y += tile) {
    for (let x = 0; x < textureSize; x += tile) {
      const alternate = ((x / tile) + (y / tile)) % 2 === 0
      tctx.fillStyle = alternate ? '#45433f' : '#2f2e2b'
      tctx.fillRect(x, y, tile, tile)
    }
  }
  tctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
  tctx.lineWidth = 2
  for (let i = 0; i <= textureSize; i += tile) {
    tctx.beginPath()
    tctx.moveTo(i, 0)
    tctx.lineTo(i, textureSize)
    tctx.stroke()
    tctx.beginPath()
    tctx.moveTo(0, i)
    tctx.lineTo(textureSize, i)
    tctx.stroke()
  }
  return tex
}

const makeSkyTexture = (textureSize: number) => {
  const tex = document.createElement('canvas')
  tex.width = textureSize * 4
  tex.height = textureSize
  const tctx = tex.getContext('2d')
  if (!tctx) return tex
  tctx.imageSmoothingEnabled = true

  const gradient = tctx.createLinearGradient(0, 0, 0, tex.height)
  gradient.addColorStop(0, '#75baff')
  gradient.addColorStop(0.55, '#4e87d8')
  gradient.addColorStop(1, '#f8c68a')
  tctx.fillStyle = gradient
  tctx.fillRect(0, 0, tex.width, tex.height)

  for (let i = 0; i < 180; i++) {
    const x = Math.random() * tex.width
    const y = Math.random() * tex.height * 0.72
    const radius = Math.random() * 1.4 + 0.4
    tctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`
    tctx.beginPath()
    tctx.arc(x, y, radius, 0, Math.PI * 2)
    tctx.fill()
  }

  tctx.fillStyle = 'rgba(255,255,255,0.08)'
  tctx.beginPath()
  tctx.arc(tex.width * 0.25, tex.height * 0.2, tex.height * 0.09, 0, Math.PI * 2)
  tctx.fill()

  return tex
}

const makeEnemyTexture = (textureSize: number, variant: number, frame: 0 | 1) => {
  const tex = document.createElement('canvas')
  tex.width = textureSize
  tex.height = textureSize
  const tctx = tex.getContext('2d')
  if (!tctx) return tex

  const palettes = [
    { body: '#8cff77', eye: '#0a180a', outline: '#20381a' },
    { body: '#ff7b7b', eye: '#2b0d0d', outline: '#4b1f1f' },
    { body: '#79e8ff', eye: '#0a1520', outline: '#183447' },
  ]
  const palette = palettes[variant % palettes.length]
  const armShift = frame === 0 ? -8 : 8
  const legShift = frame === 0 ? 7 : -7
  tctx.imageSmoothingEnabled = false
  tctx.fillStyle = 'rgba(0, 0, 0, 0)'
  tctx.clearRect(0, 0, textureSize, textureSize)
  tctx.fillStyle = palette.body
  tctx.fillRect(70, 58, 116, 124)
  tctx.fillRect(52, 84 + armShift, 18, 74)
  tctx.fillRect(186, 84 - armShift, 18, 74)
  tctx.fillStyle = palette.outline
  tctx.fillRect(70, 58, 116, 10)
  tctx.fillRect(70, 172, 116, 10)
  tctx.fillRect(70, 58, 10, 124)
  tctx.fillRect(176, 58, 10, 124)
  tctx.fillStyle = palette.eye
  tctx.fillRect(94, 96, 22, 22)
  tctx.fillRect(140, 96, 22, 22)
  tctx.fillStyle = '#fff'
  tctx.fillRect(102, 104, 8, 8)
  tctx.fillRect(148, 104, 8, 8)
  tctx.fillStyle = palette.body
  tctx.fillRect(86, 184 + legShift, 26, 34)
  tctx.fillRect(144, 184 - legShift, 26, 34)
  tctx.fillStyle = palette.outline
  tctx.fillRect(86, 184 + legShift, 26, 8)
  tctx.fillRect(144, 184 - legShift, 26, 8)
  tctx.fillStyle = 'rgba(0,0,0,0.25)'
  tctx.fillRect(96, 142, 64, 10)
  return tex
}

export const createTexturePack = (enemyCount: number, textureSize = TEXTURE_SIZE) => {
  const textures: Record<string, HTMLCanvasElement> = {
    '1': makeBrickTexture(textureSize),
    '2': makeTextTexture(textureSize, 'blog', ['openai', 'next.js', 'webgl']),
    '3': makeTextTexture(textureSize, 'click', ['-> blog', '-> grid', '-> letters']),
  }
  const floorTexture = makeFloorTexture(textureSize)
  const skyTexture = makeSkyTexture(textureSize)
  const enemyTextures = Array.from({ length: enemyCount }, (_, index) => [
    makeEnemyTexture(textureSize, index, 0),
    makeEnemyTexture(textureSize, index, 1),
  ] as const)
  return { textures, floorTexture, skyTexture, enemyTextures }
}
