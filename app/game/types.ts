export type Vec2 = { x: number; y: number }

export type EnemyDef = {
  base: Vec2
  patrol: Vec2
  speed: number
  phase: number
}

export type EnemyRuntime = {
  pos: Vec2
  patrolT: number
  patrolDir: 1 | -1
  chaseUntil: number
  hitStunUntil: number
  deadUntil: number
  lastDamageAt: number
  maxHealth: number
  health: number
  animTime: number
}
