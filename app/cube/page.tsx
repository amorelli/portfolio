'use client'

import { useEffect, useRef, useState } from 'react'

const vertexShaderSource = `
attribute vec3 aPosition;
uniform mat4 uMVP;
uniform vec2 uMouse;
uniform float uDisplace;
uniform float uPointSize;
uniform vec3 uGlowPos;
uniform vec3 uGlowNeg;
varying float vGlow;
void main() {
  vec4 projected = uMVP * vec4(aPosition, 1.0);
  vec2 ndc = projected.xy / projected.w;
  float dist = length(ndc - uMouse);
  float falloff = smoothstep(0.4, 0.0, dist);
  vec2 push = normalize(ndc - uMouse + 0.0001) * falloff * uDisplace;
  projected.xy += push * projected.w;
  float gx = aPosition.x >= 0.99 ? uGlowPos.x : (aPosition.x <= -0.99 ? uGlowNeg.x : 0.0);
  float gy = aPosition.y >= 0.99 ? uGlowPos.y : (aPosition.y <= -0.99 ? uGlowNeg.y : 0.0);
  float gz = aPosition.z >= 0.99 ? uGlowPos.z : (aPosition.z <= -0.99 ? uGlowNeg.z : 0.0);
  vGlow = max(max(gx, gy), gz);
  gl_Position = projected;
  gl_PointSize = uPointSize;
}
`

const fragmentShaderSource = `
precision mediump float;
uniform vec3 uColor;
varying float vGlow;
void main() {
  vec3 glowColor = vec3(0.2, 0.8, 1.0);
  vec3 color = uColor + glowColor * vGlow;
  gl_FragColor = vec4(color, 1.0);
}
`

type Mat4 = Float32Array

const mat4Identity = (): Mat4 =>
  new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])

const mat4Multiply = (a: Mat4, b: Mat4): Mat4 => {
  const out = new Float32Array(16)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3]
    }
  }
  return out
}

const mat4Translate = (m: Mat4, x: number, y: number, z: number): Mat4 => {
  const t = mat4Identity()
  t[12] = x
  t[13] = y
  t[14] = z
  return mat4Multiply(m, t)
}

const mat4RotateX = (m: Mat4, rad: number): Mat4 => {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const r = new Float32Array([
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    0, 0, 0, 1,
  ])
  return mat4Multiply(m, r)
}

const mat4RotateY = (m: Mat4, rad: number): Mat4 => {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const r = new Float32Array([
    c, 0, s, 0,
    0, 1, 0, 0,
    -s, 0, c, 0,
    0, 0, 0, 1,
  ])
  return mat4Multiply(m, r)
}

const mat4Perspective = (
  fov: number,
  aspect: number,
  near: number,
  far: number
): Mat4 => {
  const f = 1 / Math.tan(fov / 2)
  const nf = 1 / (near - far)
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0,
  ])
}

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader => {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('Unable to create shader')
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(log || 'Shader compile failed')
  }
  return shader
}

const createProgram = (
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram => {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) {
    throw new Error('Unable to create program')
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(log || 'Program link failed')
  }
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  return program
}

export default function CubePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [webglReady, setWebglReady] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: true, alpha: true })
    if (!gl) {
      setWebglReady(false)
      return
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource)
    gl.useProgram(program)

    const positionLocation = gl.getAttribLocation(program, 'aPosition')
    const mvpLocation = gl.getUniformLocation(program, 'uMVP')
    const colorLocation = gl.getUniformLocation(program, 'uColor')
    const mouseLocation = gl.getUniformLocation(program, 'uMouse')
    const displaceLocation = gl.getUniformLocation(program, 'uDisplace')
    const pointSizeLocation = gl.getUniformLocation(program, 'uPointSize')
    const glowPosLocation = gl.getUniformLocation(program, 'uGlowPos')
    const glowNegLocation = gl.getUniformLocation(program, 'uGlowNeg')

    const corners = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ]

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ]

    const segmentsPerEdge = 30
    const points: number[] = []
    edges.forEach(([start, end]) => {
      const a = corners[start]
      const b = corners[end]
      for (let i = 0; i <= segmentsPerEdge; i++) {
        const t = i / segmentsPerEdge
        points.push(
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t
        )
      }
    })
    const vertices = new Float32Array(points)

    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const particleCount = 140
    const particlePositions = new Float32Array(particleCount * 3)
    const particleVelocities = new Float32Array(particleCount * 3)
    const particleBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, particlePositions, gl.DYNAMIC_DRAW)

    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)

    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.DEPTH_TEST)
    gl.lineWidth(1)

    let animationFrame = 0
    let mouseX = 2
    let mouseY = 2
    let rotationTargetX = 0
    let rotationTargetY = 0
    let rotationX = 0
    let rotationY = 0
    let lastTime = 0
    const cubeSize = 1.05
    const spawnRadius = 5.5
    const maxRadius = 7
    const glowPos = new Float32Array([0, 0, 0])
    const glowNeg = new Float32Array([0, 0, 0])

    const respawnParticle = (i: number) => {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = spawnRadius + Math.random() * 1.5
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)
      particlePositions[i * 3 + 0] = x
      particlePositions[i * 3 + 1] = y
      particlePositions[i * 3 + 2] = z
      const speed = 0.6 + Math.random() * 0.6
      const invLen = 1 / Math.max(0.001, Math.hypot(x, y, z))
      particleVelocities[i * 3 + 0] = -x * invLen * speed
      particleVelocities[i * 3 + 1] = -y * invLen * speed
      particleVelocities[i * 3 + 2] = -z * invLen * speed
    }

    for (let i = 0; i < particleCount; i++) {
      respawnParticle(i)
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize)

    const handlePointerMove = (event: PointerEvent) => {
      const width = window.innerWidth || 1
      const height = window.innerHeight || 1
      const x = event.clientX / width
      const y = event.clientY / height
      mouseX = x * 2 - 1
      mouseY = (1 - y) * 2 - 1
      rotationTargetY = (x - 0.5) * Math.PI * 0.6
      rotationTargetX = (0.5 - y) * Math.PI * 0.4
    }

    const handlePointerLeave = () => {
      mouseX = 2
      mouseY = 2
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerleave', handlePointerLeave)
    window.addEventListener('blur', handlePointerLeave)

    const render = (time: number) => {
      const t = time * 0.001
      const dt = Math.min(0.05, lastTime ? (time - lastTime) * 0.001 : 0.016)
      lastTime = time
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      const aspect = canvas.width / canvas.height
      const projection = mat4Perspective(Math.PI / 3, aspect, 0.1, 100)
      rotationX += (rotationTargetX - rotationX) * 0.06
      rotationY += (rotationTargetY - rotationY) * 0.06
      let model = mat4Identity()
      model = mat4RotateY(model, t * 0.6 + rotationY)
      model = mat4RotateX(model, t * 0.4 + rotationX)
      const view = mat4Translate(mat4Identity(), 0, 0, -4)
      const mvp = mat4Multiply(projection, mat4Multiply(view, model))

      if (mvpLocation) {
        gl.uniformMatrix4fv(mvpLocation, false, mvp)
      }
      if (colorLocation) {
        gl.uniform3f(colorLocation, 0.1, 1.0, 0.6)
      }
      if (mouseLocation) {
        gl.uniform2f(mouseLocation, mouseX, mouseY)
      }
      if (displaceLocation) {
        gl.uniform1f(displaceLocation, 0.12)
      }
      if (pointSizeLocation) {
        gl.uniform1f(pointSizeLocation, 2.2)
      }
      glowPos[0] *= 0.92
      glowPos[1] *= 0.92
      glowPos[2] *= 0.92
      glowNeg[0] *= 0.92
      glowNeg[1] *= 0.92
      glowNeg[2] *= 0.92
      if (glowPosLocation) {
        gl.uniform3f(glowPosLocation, glowPos[0], glowPos[1], glowPos[2])
      }
      if (glowNegLocation) {
        gl.uniform3f(glowNegLocation, glowNeg[0], glowNeg[1], glowNeg[2])
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.POINTS, 0, vertices.length / 3)

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3
        let x = particlePositions[idx + 0]
        let y = particlePositions[idx + 1]
        let z = particlePositions[idx + 2]
        let vx = particleVelocities[idx + 0]
        let vy = particleVelocities[idx + 1]
        let vz = particleVelocities[idx + 2]

        x += vx * dt
        y += vy * dt
        z += vz * dt

        if (Math.abs(x) < cubeSize && Math.abs(y) < cubeSize && Math.abs(z) < cubeSize) {
          if (Math.abs(x) > Math.abs(y) && Math.abs(x) > Math.abs(z)) {
            vx = -vx
            if (x >= 0) {
              glowPos[0] = 1
            } else {
              glowNeg[0] = 1
            }
          } else if (Math.abs(y) > Math.abs(z)) {
            vy = -vy
            if (y >= 0) {
              glowPos[1] = 1
            } else {
              glowNeg[1] = 1
            }
          } else {
            vz = -vz
            if (z >= 0) {
              glowPos[2] = 1
            } else {
              glowNeg[2] = 1
            }
          }
          x += vx * dt * 2
          y += vy * dt * 2
          z += vz * dt * 2
        }

        particlePositions[idx + 0] = x
        particlePositions[idx + 1] = y
        particlePositions[idx + 2] = z
        particleVelocities[idx + 0] = vx
        particleVelocities[idx + 1] = vy
        particleVelocities[idx + 2] = vz

        if (Math.hypot(x, y, z) > maxRadius) {
          respawnParticle(i)
        }
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, particlePositions)
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
      if (displaceLocation) {
        gl.uniform1f(displaceLocation, 0.0)
      }
      if (colorLocation) {
        gl.uniform3f(colorLocation, 0.7, 0.9, 1.0)
      }
      if (pointSizeLocation) {
        gl.uniform1f(pointSizeLocation, 1.6)
      }
      if (glowPosLocation) {
        gl.uniform3f(glowPosLocation, 0, 0, 0)
      }
      if (glowNegLocation) {
        gl.uniform3f(glowNegLocation, 0, 0, 0)
      }
      gl.drawArrays(gl.POINTS, 0, particleCount)
      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('blur', handlePointerLeave)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <section className="relative flex flex-col gap-6">
      <div className="fixed inset-0 -z-10 bg-black">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {!webglReady && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-300">
            WebGL is unavailable in this browser.
          </div>
        )}
      </div>
      {/* <div className="max-w-xl rounded-2xl border border-neutral-200/40 bg-white/90 p-6 text-neutral-900 shadow-lg backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/80 dark:text-neutral-100">
        <h1 className="text-3xl font-semibold tracking-tight">WebGL Cube</h1>
        <p className="mt-2 text-neutral-700 dark:text-neutral-300">
          A demoscene-inspired wireframe cube rendered with raw WebGL.
        </p>
      </div> */}
    </section>
  )
}
