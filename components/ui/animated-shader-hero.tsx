import React, { useRef, useEffect } from "react"

interface HeroProps {
  trustBadge?: { text: string }
  headline: { line1: string; line2: string }
  subtitle: string
  buttons?: {
    primary?: { text: string; onClick?: () => void }
    secondary?: { text: string; onClick?: () => void }
  }
  className?: string
}

const SHADER_SRC = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

float rnd(vec2 p) {
  p = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}
float noise(in vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  float a = rnd(i), b = rnd(i + vec2(1,0)), c = rnd(i + vec2(0,1)), d = rnd(i + 1.);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p) {
  float t = .0, a = 1.; mat2 m = mat2(1., -.5, .2, 1.2);
  for (int i = 0; i < 5; i++) { t += a * noise(p); p *= 2. * m; a *= .5; }
  return t;
}
float clouds(vec2 p) {
  float d = 1., t = .0;
  for (float i = .0; i < 3.; i++) {
    float a = d * fbm(i * 10. + p.x * .2 + .2 * (1. + i) * p.y + d + i * i + p);
    t = mix(t, d, a); d = a; p *= 2. / (i + 1.);
  }
  return t;
}
void main(void) {
  vec2 uv = (FC - .5 * R) / MN, st = uv * vec2(2, 1);
  vec3 col = vec3(0);
  float bg = clouds(vec2(st.x + T * .5, -st.y));
  uv *= 1. - .3 * (sin(T * .2) * .5 + .5);
  for (float i = 1.; i < 12.; i++) {
    uv += .1 * cos(i * vec2(.1 + .01 * i, .8) + i * i + T * .5 + .1 * uv.x);
    vec2 p = uv;
    float d = length(p);
    col += .00125 / d * (cos(sin(i) * vec3(1, 2, 3)) + 1.);
    float b = noise(i + p + bg * 1.731);
    col += .002 * b / length(max(p, vec2(b * p.x * .02, p.y)));
    col = mix(col, vec3(bg * .25, bg * .137, bg * .05), d);
  }
  O = vec4(col, 1);
}`

const useShaderBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2")
    if (!gl) return
    glRef.current = gl

    const vs = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vs, `#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}`)
    gl.compileShader(vs)

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fs, SHADER_SRC)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs))
    }

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    programRef.current = program

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, "resolution")
    const uTime = gl.getUniformLocation(program, "time")

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio)

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    const loop = (now: number) => {
      gl.useProgram(program)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, now * 1e-3)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener("resize", resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return canvasRef
}

const Hero: React.FC<HeroProps> = ({ trustBadge, headline, subtitle, buttons, className = "" }) => {
  const canvasRef = useShaderBackground()

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-black ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ background: "black" }}
      />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-4">
        {trustBadge && (
          <div className="mb-8" style={{ animation: "fadeInDown 0.8s ease-out forwards" }}>
            <div className="flex items-center gap-2 px-6 py-3 backdrop-blur-md border border-white/20 rounded-full text-sm"
              style={{ background: "rgba(26,92,58,0.2)" }}>
              <span style={{ color: "#C8A84B" }}>{trustBadge.text}</span>
            </div>
          </div>
        )}
        <div className="text-center space-y-6 max-w-5xl mx-auto">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold"
              style={{
                background: "linear-gradient(135deg, #C8A84B, #E2C56A, #9A7D32, #C8A84B)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "fadeInUp 0.8s ease-out 0.2s forwards", opacity: 0,
              }}>
              {headline.line1}
            </h1>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold"
              style={{
                background: "linear-gradient(135deg, #2A7A50, #3DAA6E, #1A5C3A)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "fadeInUp 0.8s ease-out 0.4s forwards", opacity: 0,
              }}>
              {headline.line2}
            </h1>
          </div>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto font-light leading-relaxed"
            style={{ animation: "fadeInUp 0.8s ease-out 0.6s forwards", opacity: 0 }}>
            {subtitle}
          </p>
          {buttons && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10"
              style={{ animation: "fadeInUp 0.8s ease-out 0.8s forwards", opacity: 0 }}>
              {buttons.primary && (
                <button onClick={buttons.primary.onClick}
                  className="px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #1A5C3A, #2A7A50)",
                    border: "1px solid rgba(200,168,75,0.4)", color: "#E2C56A",
                  }}>
                  {buttons.primary.text}
                </button>
              )}
              {buttons.secondary && (
                <button onClick={buttons.secondary.onClick}
                  className="px-8 py-4 rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{
                    background: "rgba(200,168,75,0.08)",
                    border: "1px solid rgba(200,168,75,0.35)", color: "#C8A84B",
                  }}>
                  {buttons.secondary.text}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInUp   { from { opacity:0; transform:translateY(30px);  } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

export default Hero
