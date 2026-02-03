'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Vec2 = { x: number; y: number }

const MAP = [
  '111111111111',
  '110000000001',
  '101111111101',
  '101000001101',
  '101011101101',
  '110000000001',
  '111111111111',
]

const SPAWN = {
  x: 10.79,
  y: 5.79,
  angle: -2.34,
}

const SPRITES = [
  { x: 2.5, y: 1.5, text: ['read the blog', 'click to begin'], href: '/blog' },
  { x: 9.5, y: 1.5, text: ['cube demo'], href: '/cube' },
  { x: 2.5, y: 5.5, text: ['letters', 'stories'], href: '/letters' },
]

const mapWidth = MAP[0].length
const mapHeight = MAP.length

const isWall = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return true
  return MAP[y][x] !== '0'
}

const wallTypeAt = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return '1'
  return MAP[y][x]
}

const isOccluded = (from: Vec2, to: Vec2) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)
  if (distance < 0.001) return false

  const rayDirX = dx / distance
  const rayDirY = dy / distance
  let mapX = Math.floor(from.x)
  let mapY = Math.floor(from.y)

  const deltaDistX = Math.abs(1 / rayDirX)
  const deltaDistY = Math.abs(1 / rayDirY)
  let stepX = 0
  let stepY = 0
  let sideDistX = 0
  let sideDistY = 0

  if (rayDirX < 0) {
    stepX = -1
    sideDistX = (from.x - mapX) * deltaDistX
  } else {
    stepX = 1
    sideDistX = (mapX + 1.0 - from.x) * deltaDistX
  }
  if (rayDirY < 0) {
    stepY = -1
    sideDistY = (from.y - mapY) * deltaDistY
  } else {
    stepY = 1
    sideDistY = (mapY + 1.0 - from.y) * deltaDistY
  }

  let travelled = 0
  while (travelled < distance) {
    if (sideDistX < sideDistY) {
      mapX += stepX
      travelled = sideDistX
      sideDistX += deltaDistX
    } else {
      mapY += stepY
      travelled = sideDistY
      sideDistY += deltaDistY
    }
    if (isWall(mapX, mapY)) {
      return travelled < distance - 0.05
    }
  }
  return false
}

export default function CubePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const [isLocked, setIsLocked] = useState(false)
  const debugRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const textureSize = 256
    const makeBrickTexture = () => {
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

    const makeTextTexture = (title: string, lines: string[]) => {
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

    const textures: Record<string, HTMLCanvasElement> = {
      '1': makeBrickTexture(),
      '2': makeTextTexture('blog', ['openai', 'next.js', 'webgl']),
      '3': makeTextTexture('click', ['-> blog', '-> grid', '-> letters']),
    }

    const spriteTextures = SPRITES.map((sprite) =>
      makeTextTexture('link', sprite.text)
    )

    let animationFrame = 0
    let lastTime = 0
    let lastDebugUpdate = 0
    let shotFlashUntil = 0
    type Projectile = {
      start: Vec2
      end: Vec2
      startTime: number
      duration: number
      hitAt: number
      hitPoint: Vec2
      hitHref: string | null
      resolved: boolean
      flashUntil: number
    }
    const projectiles: Projectile[] = []
    const maxProjectiles = 10
    const projectileSpeed = 7.5

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

    const castRayToWall = (from: Vec2, dir: Vec2) => {
      let mapX = Math.floor(from.x)
      let mapY = Math.floor(from.y)

      const deltaDistX = Math.abs(1 / dir.x)
      const deltaDistY = Math.abs(1 / dir.y)
      let stepX = 0
      let stepY = 0
      let sideDistX = 0
      let sideDistY = 0

      if (dir.x < 0) {
        stepX = -1
        sideDistX = (from.x - mapX) * deltaDistX
      } else {
        stepX = 1
        sideDistX = (mapX + 1.0 - from.x) * deltaDistX
      }
      if (dir.y < 0) {
        stepY = -1
        sideDistY = (from.y - mapY) * deltaDistY
      } else {
        stepY = 1
        sideDistY = (mapY + 1.0 - from.y) * deltaDistY
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
        ? (mapX - from.x + (1 - stepX) / 2) / dir.x
        : (mapY - from.y + (1 - stepY) / 2) / dir.y

      return {
        x: from.x + dir.x * perpWallDist,
        y: from.y + dir.y * perpWallDist,
        dist: perpWallDist,
      }
    }

    const tryShoot = (time: number) => {
      const dirX = player.dir.x
      const dirY = player.dir.y
      let bestIndex = -1
      let bestDistance = Infinity
      const hitRadius = 0.35

      for (let i = 0; i < SPRITES.length; i++) {
        const sprite = SPRITES[i]
        const dx = sprite.x - player.pos.x
        const dy = sprite.y - player.pos.y
        const dist = Math.hypot(dx, dy)
        if (dist < 0.001) continue

        const proj = (dx * dirX + dy * dirY) / dist
        if (proj < 0.98) continue

        const perp = Math.abs(dx * dirY - dy * dirX)
        if (perp > hitRadius) continue

        if (isOccluded(player.pos, { x: sprite.x, y: sprite.y })) continue

        if (dist < bestDistance) {
          bestDistance = dist
          bestIndex = i
        }
      }

      const wallHit = castRayToWall(player.pos, { x: dirX, y: dirY })
      let hitAt = time + (wallHit.dist / projectileSpeed) * 1000
      let hitHref: string | null = null
      let hitPoint: Vec2 = { x: wallHit.x, y: wallHit.y }

      if (bestIndex !== -1 && bestDistance < wallHit.dist) {
        const sprite = SPRITES[bestIndex]
        hitAt = time + (bestDistance / projectileSpeed) * 1000
        hitHref = sprite.href
        hitPoint = { x: sprite.x, y: sprite.y }
      }
      projectiles.push({
        start: { x: player.pos.x, y: player.pos.y },
        end: hitPoint,
        startTime: time,
        duration: Math.max(120, (Math.hypot(hitPoint.x - player.pos.x, hitPoint.y - player.pos.y) / projectileSpeed) * 1000),
        hitAt,
        hitPoint,
        hitHref,
        resolved: false,
        flashUntil: 0,
      })
      if (projectiles.length > maxProjectiles) {
        projectiles.shift()
      }
    }

    const handlePointerDown = () => {
      if (!pointerLocked) {
        canvas.requestPointerLock?.()
        return
      }
      shotFlashUntil = performance.now() + 90
      tryShoot(performance.now())
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
      ctx.imageSmoothingEnabled = true
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = '#0c1016'
      ctx.fillRect(0, 0, width, height / 2)
      ctx.fillStyle = '#1b1f2a'
      ctx.fillRect(0, height / 2, width, height / 2)

      const zBuffer: number[] = new Array(Math.floor(width))
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

        const safePerpWallDist = Math.max(0.0001, perpWallDist)
        const lineHeight = Math.max(1, Math.floor(height / safePerpWallDist))
        const wallStart = -lineHeight / 2 + height / 2
        const wallEnd = lineHeight / 2 + height / 2
        const drawStart = Math.max(0, Math.floor(wallStart))
        const drawEnd = Math.min(height - 1, Math.floor(wallEnd))
        if (drawEnd < drawStart) continue
        const drawHeight = drawEnd - drawStart + 1

        const hitType = wallTypeAt(mapX, mapY)
        const texture = textures[hitType] || textures['1']

        let wallX = 0
        if (side === 0) {
          wallX = player.pos.y + perpWallDist * rayDirY
        } else {
          wallX = player.pos.x + perpWallDist * rayDirX
        }
        wallX -= Math.floor(wallX)
        let texX = Math.floor(wallX * textureSize)
        if (side === 0 && rayDirX < 0) texX = textureSize - texX - 1
        if (side === 1 && rayDirY > 0) texX = textureSize - texX - 1

        const texStart = Math.floor(((drawStart - wallStart) / lineHeight) * textureSize)
        const texHeight = Math.floor((drawHeight / lineHeight) * textureSize)
        const srcY = Math.max(0, Math.min(textureSize - 1, texStart))
        const srcHeight = Math.max(1, Math.min(textureSize - srcY, texHeight))

        ctx.drawImage(
          texture,
          texX,
          srcY,
          1,
          srcHeight,
          x,
          drawStart,
          1,
          drawHeight
        )

        const distanceFade = 1 / (1 + safePerpWallDist * safePerpWallDist * 0.15)
        const sideShade = side === 1 ? 0.7 : 1
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - distanceFade * sideShade})`
        ctx.fillRect(x, drawStart, 1, drawHeight)

        zBuffer[x] = safePerpWallDist
      }

      // Billboard sprites rendered in world space with z-buffer occlusion.
      const invDet = 1.0 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y)
      const spriteOrder = SPRITES
        .map((sprite, index) => ({
          index,
          dist: (player.pos.x - sprite.x) ** 2 + (player.pos.y - sprite.y) ** 2,
        }))
        .sort((a, b) => b.dist - a.dist)

      for (const entry of spriteOrder) {
        const sprite = SPRITES[entry.index]
        const tex = spriteTextures[entry.index]
        const dx = sprite.x - player.pos.x
        const dy = sprite.y - player.pos.y
        const transformX = invDet * (player.dir.y * dx - player.dir.x * dy)
        const transformY = invDet * (-player.plane.y * dx + player.plane.x * dy)
        if (transformY <= 0.1) continue

        const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY))
        const spriteHeight = Math.abs(Math.floor(height / transformY))
        const maxSpriteSize = Math.min(height * 0.75, 520)
        const clampedHeight = Math.min(spriteHeight, maxSpriteSize)
        const clampedWidth = clampedHeight
        const drawStartY = Math.max(0, Math.floor(height / 2 - clampedHeight / 2))
        const drawEndY = Math.min(height, Math.floor(height / 2 + clampedHeight / 2))
        const drawStartX = Math.floor(spriteScreenX - clampedWidth / 2)
        const drawEndX = Math.floor(spriteScreenX + clampedWidth / 2)

        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
          if (stripe < 0 || stripe >= width) continue
          if (transformY >= zBuffer[stripe]) continue
          const texX = Math.floor(((stripe - drawStartX) / clampedWidth) * tex.width)
          ctx.drawImage(
            tex,
            texX,
            0,
            1,
            tex.height,
            stripe,
            drawStartY,
            1,
            drawEndY - drawStartY
          )
        }
      }

      // Projectile flash + moving tracer + hit marker.
      const now = performance.now()
      if (shotFlashUntil > now) {
        const alpha = (shotFlashUntil - now) / 90
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = 'rgba(255, 240, 200, 0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(width / 2, height / 2)
        ctx.lineTo(width / 2, height / 2 - 18)
        ctx.stroke()
        ctx.restore()
      }
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i]
        const t = Math.min(1, (now - projectile.startTime) / projectile.duration)
        if (t >= 1 && now > projectile.hitAt + 200) {
          projectiles.splice(i, 1)
          continue
        }

        const px = projectile.start.x + (projectile.end.x - projectile.start.x) * t
        const py = projectile.start.y + (projectile.end.y - projectile.start.y) * t
        const dx = px - player.pos.x
        const dy = py - player.pos.y
        const invDetProj = 1.0 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y)
        const transformX = invDetProj * (player.dir.y * dx - player.dir.x * dy)
        const transformY = invDetProj * (-player.plane.y * dx + player.plane.x * dy)
        if (transformY > 0.1) {
          const screenX = (width / 2) * (1 + transformX / transformY)
          const size = Math.max(3, Math.min(14, height / transformY * 0.035))
          ctx.save()
          ctx.fillStyle = 'rgba(255, 220, 170, 0.9)'
          ctx.beginPath()
          ctx.arc(screenX, height / 2, size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        if (!projectile.resolved && now >= projectile.hitAt) {
          projectile.resolved = true
          projectile.flashUntil = now + 140
          if (projectile.hitHref) {
            router.push(projectile.hitHref)
          }
        }

        if (projectile.flashUntil > now) {
          const alpha = (projectile.flashUntil - now) / 140
          const hitDx = projectile.hitPoint.x - player.pos.x
          const hitDy = projectile.hitPoint.y - player.pos.y
          const invDetHit = 1.0 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y)
          const transformHitX = invDetHit * (player.dir.y * hitDx - player.dir.x * hitDy)
          const transformHitY = invDetHit * (-player.plane.y * hitDx + player.plane.x * hitDy)
          if (transformHitY > 0.1) {
            const hitScreenX = (width / 2) * (1 + transformHitX / transformHitY)
            const size = Math.max(4, Math.min(16, height / transformHitY * 0.04))
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.strokeStyle = 'rgba(120, 220, 255, 0.9)'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(hitScreenX, height / 2, size, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }
        }
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
      {isLocked && (
      <div className="pointer-events-none absolute left-0 top-6 z-10 max-w-sm bg-black/50 p-2 text-xs text-white">
        <div ref={debugRef} className="text-white/80" />
          <div className="mt-1 text-white/70">WASD to move, mouse to look, click to shoot, ESC to unlock mouse.</div>
      </div>
      )}
    </section>
  )
}
