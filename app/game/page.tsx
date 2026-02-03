'use client'

import { useEffect, useRef, useState } from 'react'
import { createTexturePack, TEXTURE_SIZE } from './textures'
import type { EnemyRuntime, Vec2 } from './types'
import { ENEMIES, SPAWN, isOccluded, isWall, wallTypeAt } from './world'

export default function CubePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const [isLocked, setIsLocked] = useState(false)
  const [hud, setHud] = useState({ health: 100, maxHealth: 100, enemies: ENEMIES.length })
  const debugRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const textureSize = TEXTURE_SIZE
    const { textures, floorTexture, skyTexture, enemyTextures } = createTexturePack(ENEMIES.length, textureSize)
    const floorTexCtx = floorTexture.getContext('2d')
    const floorTexData = floorTexCtx?.getImageData(0, 0, textureSize, textureSize).data
    const floorRenderScale = 0.4
    let floorBuffer: HTMLCanvasElement | null = null
    let floorCtx: CanvasRenderingContext2D | null = null
    let floorImageData: ImageData | null = null
    const enemyMaxHealth = 2
    const enemyRespawnMs = 3000
    const enemyKnockbackDistance = 0.42
    const enemyHitStunMs = 220
    const enemyStates: EnemyRuntime[] = ENEMIES.map((enemy) => {
      const phase = ((enemy.phase % 2) + 2) % 2
      const patrolDir: 1 | -1 = phase <= 1 ? 1 : -1
      const patrolT = phase <= 1 ? phase : 2 - phase
      return {
        pos: {
          x: enemy.base.x + enemy.patrol.x * patrolT,
          y: enemy.base.y + enemy.patrol.y * patrolT,
        },
        patrolT,
        patrolDir,
        chaseUntil: 0,
        hitStunUntil: 0,
        deadUntil: 0,
        lastDamageAt: -99999,
        health: enemyMaxHealth,
        animTime: 0,
      }
    })

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
      hitEnemyIndex: number | null
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
    const playerMaxHealth = 100
    const enemyContactDamage = 14
    const enemyContactRange = 0.52
    const enemyContactCooldownMs = 650
    const enemyDetectionRange = 5.4
    const enemyForgetMs = 1700
    const enemyPatrolMoveSpeed = 0.95
    const enemyChaseMoveSpeed = 1.35
    const enemyRadius = 0.18
    let playerHealth = playerMaxHealth
    let playerDeadUntil = 0
    let playerDamageFlashUntil = 0
    let pointerLocked = false

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth || window.innerWidth
      const height = canvas.clientHeight || window.innerHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const floorWidth = Math.max(64, Math.floor(width * floorRenderScale))
      const floorHeight = Math.max(32, Math.floor((height * 0.5) * floorRenderScale))
      floorBuffer = document.createElement('canvas')
      floorBuffer.width = floorWidth
      floorBuffer.height = floorHeight
      floorCtx = floorBuffer.getContext('2d')
      floorImageData = floorCtx?.createImageData(floorWidth, floorHeight) ?? null
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

    const canOccupy = (x: number, y: number, r: number) => {
      return (
        !isWall(Math.floor(x - r), Math.floor(y - r)) &&
        !isWall(Math.floor(x + r), Math.floor(y - r)) &&
        !isWall(Math.floor(x - r), Math.floor(y + r)) &&
        !isWall(Math.floor(x + r), Math.floor(y + r))
      )
    }

    const moveEnemyWithCollision = (enemyIndex: number, velocity: Vec2, dt: number) => {
      const enemy = enemyStates[enemyIndex]
      const nextX = enemy.pos.x + velocity.x * dt
      const nextY = enemy.pos.y + velocity.y * dt
      if (canOccupy(nextX, enemy.pos.y, enemyRadius)) {
        enemy.pos.x = nextX
      }
      if (canOccupy(enemy.pos.x, nextY, enemyRadius)) {
        enemy.pos.y = nextY
      }
    }

    const knockbackEnemy = (enemyIndex: number, from: Vec2) => {
      const enemy = enemyStates[enemyIndex]
      const dx = enemy.pos.x - from.x
      const dy = enemy.pos.y - from.y
      const len = Math.hypot(dx, dy) || 1
      const nx = dx / len
      const ny = dy / len
      const scales = [1, 0.66, 0.33]
      for (const scale of scales) {
        const testX = enemy.pos.x + nx * enemyKnockbackDistance * scale
        const testY = enemy.pos.y + ny * enemyKnockbackDistance * scale
        if (canOccupy(testX, testY, enemyRadius)) {
          enemy.pos.x = testX
          enemy.pos.y = testY
          return
        }
      }
    }

    const resolvePlayerEnemyCollision = (time: number) => {
      const minDist = radius + enemyRadius + 0.02
      for (let i = 0; i < enemyStates.length; i++) {
        const enemy = enemyStates[i]
        if (enemy.deadUntil > time) continue
        const dx = player.pos.x - enemy.pos.x
        const dy = player.pos.y - enemy.pos.y
        const dist = Math.hypot(dx, dy)
        if (dist >= minDist) continue

        const nx = dist > 0.0001 ? dx / dist : player.dir.x
        const ny = dist > 0.0001 ? dy / dist : player.dir.y
        const overlap = minDist - Math.max(0.0001, dist)
        const pushX = player.pos.x + nx * overlap
        const pushY = player.pos.y + ny * overlap

        if (canOccupy(pushX, player.pos.y, radius)) {
          player.pos.x = pushX
        }
        if (canOccupy(player.pos.x, pushY, radius)) {
          player.pos.y = pushY
        }
      }
    }

    const resetPlayer = (time: number) => {
      playerHealth = playerMaxHealth
      playerDeadUntil = 0
      playerDamageFlashUntil = time + 260
      player.pos.x = SPAWN.x
      player.pos.y = SPAWN.y
      const spawnDirX = Math.cos(SPAWN.angle)
      const spawnDirY = Math.sin(SPAWN.angle)
      player.dir.x = spawnDirX
      player.dir.y = spawnDirY
      player.plane.x = -spawnDirY * 0.66
      player.plane.y = spawnDirX * 0.66
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

    const updateEnemies = (time: number, dt: number) => {
      for (let i = 0; i < ENEMIES.length; i++) {
        const enemyDef = ENEMIES[i]
        const enemy = enemyStates[i]

        if (enemy.deadUntil > time) continue

        const toPlayerX = player.pos.x - enemy.pos.x
        const toPlayerY = player.pos.y - enemy.pos.y
        const distToPlayer = Math.hypot(toPlayerX, toPlayerY)

        if (distToPlayer < enemyDetectionRange && !isOccluded(enemy.pos, player.pos)) {
          enemy.chaseUntil = time + enemyForgetMs
        }

        let velocity: Vec2 = { x: 0, y: 0 }
        let moving = false
        if (enemy.hitStunUntil > time) {
          moving = false
        } else if (enemy.chaseUntil > time && distToPlayer > 0.22) {
          const chaseSpeed = enemyChaseMoveSpeed + enemyDef.speed * 0.35
          velocity = {
            x: (toPlayerX / distToPlayer) * chaseSpeed,
            y: (toPlayerY / distToPlayer) * chaseSpeed,
          }
          moving = true
        } else {
          enemy.chaseUntil = 0
          enemy.patrolT += enemy.patrolDir * enemyDef.speed * dt
          if (enemy.patrolT > 1) {
            enemy.patrolT = 1
            enemy.patrolDir = -1
          } else if (enemy.patrolT < 0) {
            enemy.patrolT = 0
            enemy.patrolDir = 1
          }
          const targetX = enemyDef.base.x + enemyDef.patrol.x * enemy.patrolT
          const targetY = enemyDef.base.y + enemyDef.patrol.y * enemy.patrolT
          const dx = targetX - enemy.pos.x
          const dy = targetY - enemy.pos.y
          const dist = Math.hypot(dx, dy)
          if (dist > 0.01) {
            const patrolSpeed = enemyPatrolMoveSpeed + enemyDef.speed * 0.3
            velocity = {
              x: (dx / dist) * patrolSpeed,
              y: (dy / dist) * patrolSpeed,
            }
            moving = true
          }
        }

        if (moving) {
          moveEnemyWithCollision(i, velocity, dt)
          enemy.animTime += dt * Math.max(0.8, Math.hypot(velocity.x, velocity.y))
        }

        const enemyToPlayerX = player.pos.x - enemy.pos.x
        const enemyToPlayerY = player.pos.y - enemy.pos.y
        const contactDist = Math.hypot(enemyToPlayerX, enemyToPlayerY)
        if (
          playerDeadUntil <= time &&
          contactDist < enemyContactRange &&
          !isOccluded(enemy.pos, player.pos) &&
          time - enemy.lastDamageAt >= enemyContactCooldownMs
        ) {
          enemy.lastDamageAt = time
          playerHealth = Math.max(0, playerHealth - enemyContactDamage)
          playerDamageFlashUntil = time + 120
          if (playerHealth <= 0) {
            playerDeadUntil = time + 1300
            break
          }
        }
      }
    }

    const tryShoot = (time: number) => {
      const dirX = player.dir.x
      const dirY = player.dir.y
      let bestIndex = -1
      let bestDistance = Infinity
      const hitRadius = 0.35

      for (let i = 0; i < ENEMIES.length; i++) {
        if (enemyStates[i].deadUntil > time) continue
        const enemyPos = enemyStates[i].pos
        const dx = enemyPos.x - player.pos.x
        const dy = enemyPos.y - player.pos.y
        const dist = Math.hypot(dx, dy)
        if (dist < 0.001) continue

        const proj = (dx * dirX + dy * dirY) / dist
        if (proj < 0.98) continue

        const perp = Math.abs(dx * dirY - dy * dirX)
        if (perp > hitRadius) continue

        if (isOccluded(player.pos, enemyPos)) continue

        if (dist < bestDistance) {
          bestDistance = dist
          bestIndex = i
        }
      }

      const wallHit = castRayToWall(player.pos, { x: dirX, y: dirY })
      let hitAt = time + (wallHit.dist / projectileSpeed) * 1000
      let hitEnemyIndex: number | null = null
      let hitPoint: Vec2 = { x: wallHit.x, y: wallHit.y }

      if (bestIndex !== -1 && bestDistance < wallHit.dist) {
        if (enemyStates[bestIndex].deadUntil <= time) {
          const enemyPos = enemyStates[bestIndex].pos
          hitAt = time + (bestDistance / projectileSpeed) * 1000
          hitEnemyIndex = bestIndex
          hitPoint = { x: enemyPos.x, y: enemyPos.y }
        }
      }
      projectiles.push({
        start: { x: player.pos.x, y: player.pos.y },
        end: hitPoint,
        startTime: time,
        duration: Math.max(120, (Math.hypot(hitPoint.x - player.pos.x, hitPoint.y - player.pos.y) / projectileSpeed) * 1000),
        hitAt,
        hitPoint,
        hitEnemyIndex,
        resolved: false,
        flashUntil: 0,
      })
      if (projectiles.length > maxProjectiles) {
        projectiles.shift()
      }
    }

    const handlePointerDown = () => {
      const now = performance.now()
      if (!pointerLocked) {
        canvas.requestPointerLock?.()
        return
      }
      if (playerDeadUntil > now) return
      shotFlashUntil = performance.now() + 90
      tryShoot(now)
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
      if (playerDeadUntil <= time) {
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
          resolvePlayerEnemyCollision(time)
        }

        let rot = 0
        if (keys.has('arrowleft')) rot -= rotSpeed * dt
        if (keys.has('arrowright')) rot += rotSpeed * dt
        rotatePlayer(rot)
      }

      if (playerDeadUntil > 0 && time >= playerDeadUntil) {
        resetPlayer(time)
      }
      if (playerDeadUntil <= time) {
        updateEnemies(time, dt)
        resolvePlayerEnemyCollision(time)
      }

      const width = canvas.width / (window.devicePixelRatio || 1)
      const height = canvas.height / (window.devicePixelRatio || 1)
      const widthInt = Math.max(1, Math.floor(width))
      const heightInt = Math.max(1, Math.floor(height))
      const horizon = Math.floor(heightInt / 2)
      ctx.imageSmoothingEnabled = true
      ctx.clearRect(0, 0, width, height)

      const skyWidth = skyTexture.width
      const viewAngle = Math.atan2(player.dir.y, player.dir.x)
      const fov = 2 * Math.atan2(Math.hypot(player.plane.x, player.plane.y), 1)
      const srcWidth = Math.max(1, Math.floor((fov / (Math.PI * 2)) * skyWidth))
      const center = (((viewAngle / (Math.PI * 2)) % 1) + 1) % 1
      let srcLeft = Math.floor(center * skyWidth - srcWidth / 2)
      while (srcLeft < 0) srcLeft += skyWidth
      srcLeft %= skyWidth
      const firstWidth = Math.min(srcWidth, skyWidth - srcLeft)
      ctx.drawImage(skyTexture, srcLeft, 0, firstWidth, skyTexture.height, 0, 0, (firstWidth / srcWidth) * widthInt, horizon + 1)
      if (firstWidth < srcWidth) {
        const secondWidth = srcWidth - firstWidth
        ctx.drawImage(
          skyTexture,
          0,
          0,
          secondWidth,
          skyTexture.height,
          (firstWidth / srcWidth) * widthInt,
          0,
          (secondWidth / srcWidth) * widthInt,
          horizon + 1
        )
      }
      ctx.fillStyle = 'rgba(255, 220, 170, 0.08)'
      ctx.fillRect(0, horizon - 16, widthInt, 16)

      if (floorBuffer && floorCtx && floorImageData && floorTexData) {
        const floorWidth = floorBuffer.width
        const floorHeight = floorBuffer.height
        const pixels = floorImageData.data
        const rayDirX0 = player.dir.x - player.plane.x
        const rayDirY0 = player.dir.y - player.plane.y
        const rayDirX1 = player.dir.x + player.plane.x
        const rayDirY1 = player.dir.y + player.plane.y
        const posZ = 0.5 * heightInt
        const halfHeight = heightInt * 0.5

        for (let y = 0; y < floorHeight; y++) {
          const screenY = horizon + ((y + 0.5) / floorHeight) * (heightInt - horizon)
          const p = Math.max(1, screenY - halfHeight)
          const rowDistance = posZ / p
          const stepX = rowDistance * (rayDirX1 - rayDirX0) / floorWidth
          const stepY = rowDistance * (rayDirY1 - rayDirY0) / floorWidth
          let floorX = player.pos.x + rowDistance * rayDirX0
          let floorY = player.pos.y + rowDistance * rayDirY0
          const shade = 1 / (1 + rowDistance * 0.12)
          const depthShade = 1 - (y / floorHeight) * 0.38
          const brightness = Math.max(0.1, shade * depthShade)

          for (let x = 0; x < floorWidth; x++) {
            const cellX = Math.floor(floorX)
            const cellY = Math.floor(floorY)
            const texX = Math.floor((floorX - cellX) * textureSize) & (textureSize - 1)
            const texY = Math.floor((floorY - cellY) * textureSize) & (textureSize - 1)
            const srcIndex = (texY * textureSize + texX) * 4
            const dstIndex = (y * floorWidth + x) * 4
            pixels[dstIndex] = floorTexData[srcIndex] * brightness
            pixels[dstIndex + 1] = floorTexData[srcIndex + 1] * brightness
            pixels[dstIndex + 2] = floorTexData[srcIndex + 2] * brightness
            pixels[dstIndex + 3] = 255
            floorX += stepX
            floorY += stepY
          }
        }

        floorCtx.putImageData(floorImageData, 0, 0)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(floorBuffer, 0, horizon + 1, widthInt, heightInt - horizon)
        ctx.imageSmoothingEnabled = true
      }

      const zBuffer: number[] = new Array(widthInt)
      for (let x = 0; x < widthInt; x++) {
        const cameraX = (2 * x) / widthInt - 1
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
      const spriteOrder = enemyStates
        .map((enemy, index) => {
          if (enemy.deadUntil > time) return null
          return {
            index,
            x: enemy.pos.x,
            y: enemy.pos.y,
            animTime: enemy.animTime,
            dist: (player.pos.x - enemy.pos.x) ** 2 + (player.pos.y - enemy.pos.y) ** 2,
          }
        })
        .filter((sprite): sprite is { index: number; x: number; y: number; animTime: number; dist: number } => Boolean(sprite))
        .sort((a, b) => b.dist - a.dist)

      for (const entry of spriteOrder) {
        const frame = Math.floor(entry.animTime * 8) % 2
        const tex = enemyTextures[entry.index][frame]
        const dx = entry.x - player.pos.x
        const dy = entry.y - player.pos.y
        const transformX = invDet * (player.dir.y * dx - player.dir.x * dy)
        const transformY = invDet * (-player.plane.y * dx + player.plane.x * dy)
        if (transformY <= 0.1) continue

        const spriteScreenX = Math.floor((widthInt / 2) * (1 + transformX / transformY))
        const enemyScale = 0.58
        const spriteHeight = Math.abs(Math.floor((heightInt / transformY) * enemyScale))
        const maxSpriteSize = Math.min(heightInt * 0.5, 360)
        const clampedHeight = Math.min(spriteHeight, maxSpriteSize)
        const clampedWidth = clampedHeight
        const drawStartY = Math.max(0, Math.floor(heightInt / 2 - clampedHeight / 2))
        const drawEndY = Math.min(heightInt, Math.floor(heightInt / 2 + clampedHeight / 2))
        const drawStartX = Math.floor(spriteScreenX - clampedWidth / 2)
        const drawEndX = Math.floor(spriteScreenX + clampedWidth / 2)

        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
          if (stripe < 0 || stripe >= widthInt) continue
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
        ctx.moveTo(widthInt / 2, heightInt / 2)
        ctx.lineTo(widthInt / 2, heightInt / 2 - 18)
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
          const screenX = (widthInt / 2) * (1 + transformX / transformY)
          const size = Math.max(3, Math.min(14, (heightInt / transformY) * 0.035))
          ctx.save()
          ctx.fillStyle = 'rgba(255, 220, 170, 0.9)'
          ctx.beginPath()
          ctx.arc(screenX, heightInt / 2, size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        if (!projectile.resolved && now >= projectile.hitAt) {
          projectile.resolved = true
          projectile.flashUntil = now + 140
          if (projectile.hitEnemyIndex !== null) {
            const enemyIndex = projectile.hitEnemyIndex
            const enemy = enemyStates[enemyIndex]
            if (enemy.deadUntil <= now) {
              enemy.health = Math.max(0, enemy.health - 1)
              enemy.hitStunUntil = now + enemyHitStunMs
              enemy.chaseUntil = now + enemyForgetMs
              knockbackEnemy(enemyIndex, projectile.start)
              if (enemy.health <= 0) {
                enemy.deadUntil = now + enemyRespawnMs
                enemy.chaseUntil = 0
                enemy.hitStunUntil = 0
                enemy.patrolT = 0
                enemy.patrolDir = 1
                enemy.health = enemyMaxHealth
                enemy.pos = { x: ENEMIES[enemyIndex].base.x, y: ENEMIES[enemyIndex].base.y }
              }
            }
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
            const hitScreenX = (widthInt / 2) * (1 + transformHitX / transformHitY)
            const size = Math.max(4, Math.min(16, (heightInt / transformHitY) * 0.04))
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.strokeStyle = 'rgba(120, 220, 255, 0.9)'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(hitScreenX, heightInt / 2, size, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      if (playerDamageFlashUntil > now) {
        const alpha = Math.min(0.42, (playerDamageFlashUntil - now) / 120)
        ctx.fillStyle = `rgba(255, 35, 20, ${alpha})`
        ctx.fillRect(0, 0, widthInt, heightInt)
      }

      if (playerDeadUntil > now) {
        const alpha = Math.min(0.82, 0.35 + (playerDeadUntil - now) / 1400)
        ctx.fillStyle = `rgba(10, 0, 0, ${alpha})`
        ctx.fillRect(0, 0, widthInt, heightInt)
        ctx.fillStyle = 'rgba(255, 230, 220, 0.92)'
        ctx.font = '700 24px "Geist Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('you were overrun', widthInt / 2, heightInt / 2 - 6)
        ctx.font = '400 14px "Geist Mono", monospace'
        ctx.fillText('respawning...', widthInt / 2, heightInt / 2 + 24)
        ctx.textAlign = 'left'
      }

      if (debugRef.current && time - lastDebugUpdate > 120) {
        lastDebugUpdate = time
        const angle = Math.atan2(player.dir.y, player.dir.x)
        const livingEnemies = enemyStates.filter((enemy) => enemy.deadUntil <= time).length
        debugRef.current.textContent = `hp: ${playerHealth}/${playerMaxHealth} | enemies: ${livingEnemies} | pos: ${player.pos.x.toFixed(2)}, ${player.pos.y.toFixed(2)} | angle: ${angle.toFixed(2)} rad`
        setHud({ health: playerHealth, maxHealth: playerMaxHealth, enemies: livingEnemies })
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
      <div className="pointer-events-none absolute left-0 top-6 z-10 w-[min(26rem,90vw)] bg-black/55 p-2 text-xs text-white">
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-white/80">
            <span>health</span>
            <span>{hud.health}/{hud.maxHealth} • {hud.enemies} live</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-sm border border-white/30 bg-black/60">
            <div
              className="h-full bg-red-500/90 transition-[width] duration-150 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100))}%` }}
            />
          </div>
        </div>
        <div ref={debugRef} className="text-white/80" />
          <div className="mt-1 text-white/70">WASD to move, mouse to look, click to shoot, ESC to unlock mouse.</div>
      </div>
      )}
    </section>
  )
}
