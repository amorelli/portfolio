'use client'

import { useEffect, useRef, useState } from 'react'

const vertexShaderSource = `
attribute vec3 aPosition;
uniform mat4 uMVP;
void main() {
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`

const fragmentShaderSource = `
precision mediump float;
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
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

    const vertices = new Float32Array([
      -1, -1, -1,
      1, -1, -1,
      1, 1, -1,
      -1, 1, -1,
      -1, -1, 1,
      1, -1, 1,
      1, 1, 1,
      -1, 1, 1,
    ])

    const indices = new Uint16Array([
      0, 1, 1, 2, 2, 3, 3, 0,
      4, 5, 5, 6, 6, 7, 7, 4,
      0, 4, 1, 5, 2, 6, 3, 7,
    ])

    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)

    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.DEPTH_TEST)
    gl.lineWidth(1)

    let animationFrame = 0

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

    const render = (time: number) => {
      const t = time * 0.001
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      const aspect = canvas.width / canvas.height
      const projection = mat4Perspective(Math.PI / 3, aspect, 0.1, 100)
      let model = mat4Identity()
      model = mat4RotateY(model, t * 0.8)
      // model = mat4RotateX(model, t * 0.6)
      const view = mat4Translate(mat4Identity(), 0, 0, -4)
      const mvp = mat4Multiply(projection, mat4Multiply(view, model))

      if (mvpLocation) {
        gl.uniformMatrix4fv(mvpLocation, false, mvp)
      }
      if (colorLocation) {
        gl.uniform3f(colorLocation, 0.1, 1.0, 0.6)
      }

      gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0)
      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
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
