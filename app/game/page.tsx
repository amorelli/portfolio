'use client'

import { useEffect, useRef, useState } from 'react'

type Vec2 = { x: number; y: number }

const MAP = [
  '111111111111',
  '100000000001',
  '101111111101',
  '101000001101',
  '101011101101',
  '100000000001',
  '111111111111',
]

const SPAWN = {
  x: 3.65,
  y: 5.26,
  angle: -0.71,
}

const mapWidth = MAP[0].length
const mapHeight = MAP.length

const isWall = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return true
  return MAP[y][x] === '1'
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const shadeColor = (base: Vec2, brightness: number) => {
  const r = Math.floor(clamp(base.x * brightness, 0, 255))
  const g = Math.floor(clamp(base.y * brightness, 0, 255))
  const b = Math.floor(clamp(220 * brightness, 0, 255))
  return `rgb(${r}, ${g}, ${b})`
}

export default function CubePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const [isLocked, setIsLocked] = useState(false)
  const debugRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame = 0
    let lastTime = 0
    let lastDebugUpdate = 0

    const dirX = Math.cos(SPAWN.angle)
    const dirY = Math.sin(SPAWN.angle)
    const player = {
      pos: { x: SPAWN.x, y: SPAWN.y },
      dir: { x: dirX, y: dirY },
      plane: { x: -dirY * 0.66, y: dirX * 0.66 },
    }

    const speed = 2.6
    const rotSpeed = 1.8
    const radius = 0.2
    const mouseSensitivity = 0.0025
    let pointerLocked = false

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth || window.innerWidth
      const height = canvas.clientHeight || window.innerHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const moveWithCollision = (next: Vec2) => {
      const nextX = next.x
      const nextY = next.y
      if (!isWall(Math.floor(nextX + Math.sign(nextX - player.pos.x) * radius), Math.floor(player.pos.y))) {
        player.pos.x = nextX
      }
      if (!isWall(Math.floor(player.pos.x), Math.floor(nextY + Math.sign(nextY - player.pos.y) * radius))) {
        player.pos.y = nextY
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase())
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase())
    }

    const rotatePlayer = (rot: number) => {
      if (rot === 0) return
      const cos = Math.cos(rot)
      const sin = Math.sin(rot)
      const oldDirX = player.dir.x
      player.dir.x = player.dir.x * cos - player.dir.y * sin
      player.dir.y = oldDirX * sin + player.dir.y * cos
      const oldPlaneX = player.plane.x
      player.plane.x = player.plane.x * cos - player.plane.y * sin
      player.plane.y = oldPlaneX * sin + player.plane.y * cos
    }

    const handlePointerDown = () => {
      canvas.requestPointerLock?.()
    }

    const handlePointerLockChange = () => {
      pointerLocked = document.pointerLockElement === canvas
      setIsLocked(pointerLocked)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerLocked) return
      const rot = event.movementX * mouseSensitivity
      rotatePlayer(rot)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    window.addEventListener('pointermove', handlePointerMove)

    const render = (time: number) => {
      const dt = Math.min(0.05, lastTime ? (time - lastTime) * 0.001 : 0.016)
      lastTime = time

      const keys = keysRef.current
      let moveX = 0
      let moveY = 0
      if (keys.has('w')) {
        moveX += player.dir.x
        moveY += player.dir.y
      }
      if (keys.has('s')) {
        moveX -= player.dir.x
        moveY -= player.dir.y
      }
      if (keys.has('a')) {
        moveX += player.dir.y
        moveY -= player.dir.x
      }
      if (keys.has('d')) {
        moveX -= player.dir.y
        moveY += player.dir.x
      }

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY)
        const next = {
          x: player.pos.x + (moveX / len) * speed * dt,
          y: player.pos.y + (moveY / len) * speed * dt,
        }
        moveWithCollision(next)
      }

      let rot = 0
      if (keys.has('arrowleft')) rot -= rotSpeed * dt
      if (keys.has('arrowright')) rot += rotSpeed * dt
      rotatePlayer(rot)

      const width = canvas.width / (window.devicePixelRatio || 1)
      const height = canvas.height / (window.devicePixelRatio || 1)
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = '#0c1016'
      ctx.fillRect(0, 0, width, height / 2)
      ctx.fillStyle = '#1b1f2a'
      ctx.fillRect(0, height / 2, width, height / 2)

      const wallBase = { x: 120, y: 190 }

      for (let x = 0; x < width; x++) {
        const cameraX = 2 * x / width - 1
        const rayDirX = player.dir.x + player.plane.x * cameraX
        const rayDirY = player.dir.y + player.plane.y * cameraX

        let mapX = Math.floor(player.pos.x)
        let mapY = Math.floor(player.pos.y)

        const deltaDistX = Math.abs(1 / rayDirX)
        const deltaDistY = Math.abs(1 / rayDirY)
        let stepX = 0
        let stepY = 0
        let sideDistX = 0
        let sideDistY = 0

        if (rayDirX < 0) {
          stepX = -1
          sideDistX = (player.pos.x - mapX) * deltaDistX
        } else {
          stepX = 1
          sideDistX = (mapX + 1.0 - player.pos.x) * deltaDistX
        }
        if (rayDirY < 0) {
          stepY = -1
          sideDistY = (player.pos.y - mapY) * deltaDistY
        } else {
          stepY = 1
          sideDistY = (mapY + 1.0 - player.pos.y) * deltaDistY
        }

        let hit = 0
        let side = 0
        while (hit === 0) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaDistX
            mapX += stepX
            side = 0
          } else {
            sideDistY += deltaDistY
            mapY += stepY
            side = 1
          }
          if (isWall(mapX, mapY)) hit = 1
        }

        const perpWallDist = side === 0
          ? (mapX - player.pos.x + (1 - stepX) / 2) / rayDirX
          : (mapY - player.pos.y + (1 - stepY) / 2) / rayDirY

        const lineHeight = Math.floor(height / Math.max(0.0001, perpWallDist))
        let drawStart = -lineHeight / 2 + height / 2
        let drawEnd = lineHeight / 2 + height / 2
        drawStart = Math.max(0, drawStart)
        drawEnd = Math.min(height - 1, drawEnd)

        const distanceFade = 1 / (1 + perpWallDist * perpWallDist * 0.15)
        const sideShade = side === 1 ? 0.7 : 1
        ctx.fillStyle = shadeColor(wallBase, distanceFade * sideShade)
        ctx.fillRect(x, drawStart, 1, drawEnd - drawStart)
      }

      if (debugRef.current && time - lastDebugUpdate > 120) {
        lastDebugUpdate = time
        const angle = Math.atan2(player.dir.y, player.dir.x)
        debugRef.current.textContent = `pos: ${player.pos.x.toFixed(2)}, ${player.pos.y.toFixed(2)} | angle: ${angle.toFixed(2)} rad`
      }

      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      window.removeEventListener('pointermove', handlePointerMove)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <section className="relative">
      <div className="fixed inset-0 z-0 bg-black">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
      <div className="pointer-events-none absolute left-0 top-6 z-10 max-w-sm bg-black/50 p-2 text-xs text-white">
        <div ref={debugRef} className="text-white/80" />
        {isLocked && (
          <div className="mt-1 text-white/70">WASD to move, mouse to look, ESC to unlock mouse.</div>
        )}
      </div>
    </section>
  )
}
