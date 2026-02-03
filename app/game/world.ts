import { EnemyDef, Vec2 } from './types'

export const MAP = [
  '111111111111',
  '110000000001',
  '101111111101',
  '101000001101',
  '101011101101',
  '110000000001',
  '111111111111',
]

export const SPAWN = {
  x: 10.79,
  y: 5.79,
  angle: -2.34,
}

export const ENEMIES: EnemyDef[] = [
  { base: { x: 2.7, y: 1.5 }, patrol: { x: 3.2, y: 0 }, speed: 0.5, phase: 0.1 },
  { base: { x: 9.4, y: 1.5 }, patrol: { x: -2.8, y: 0 }, speed: 0.42, phase: 0.6 },
  { base: { x: 2.4, y: 5.5 }, patrol: { x: 4.4, y: 0 }, speed: 0.47, phase: 1.2 },
]

const mapWidth = MAP[0].length
const mapHeight = MAP.length

export const isWall = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return true
  return MAP[y][x] !== '0'
}

export const wallTypeAt = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return '1'
  return MAP[y][x]
}

export const isOccluded = (from: Vec2, to: Vec2) => {
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
