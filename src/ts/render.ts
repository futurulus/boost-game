import { TickEvent } from "./types";

const DT_MAX = 0.1;

export class Renderer {
  ctx: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  shader: WebGLProgram;
  attribs: { [key: string]: number };
  uniforms: { [key: string]: WebGLUniformLocation };

  running: boolean = false;
  oldTimeStamp: number = 0;

  constructor(ctx: WebGLRenderingContext, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.running = false;
    this.attribs = {};
    this.uniforms = {};
    this.compileShaders();
  }

  private compileShaders() {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

    // Vertex shader
    const gl = this.ctx;
    const vertexShaderSource = `
      attribute vec4 aVertexPosition;
      uniform mat4 uModelViewMatrix;
      varying lowp vec3 vVertexColor;
      void main() {
        gl_Position = uModelViewMatrix * aVertexPosition;
        vVertexColor = 0.5 * gl_Position.xyz + 0.5;
      }
    `;
    const fragmentShaderSource = `
      varying lowp vec3 vVertexColor;
      void main() {
        gl_FragColor = vec4(vVertexColor.rgb, 1.0);
      }
    `;
    const vertexShader = this.loadShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = gl.createProgram();
    if (shaderProgram === null) throw "Unable to create shader program";

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      throw `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram,
      )}`;
    }

    this.attribs.vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    const modelViewMatrix = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    if (modelViewMatrix === null) throw "Unable to find uModelViewMatrix location";
    this.uniforms.modelViewMatrix = modelViewMatrix;

    this.shader = shaderProgram;
  }

  private loadShader(type: number, source: string): WebGLShader {
    const gl = this.ctx;

    const shader = gl.createShader(type);
    if (shader === null) throw "Unable to create shader program";

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const errorMessage = `An error occurred compiling the shaders: ${
        gl.getShaderInfoLog(shader)
      }`;
      gl.deleteShader(shader);
      throw errorMessage;
    }

    return shader;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.nextFrame();
  }

  stop() {
    this.running = false;
  }

  private nextFrame() {
    if (!this.running) return;
    window.requestAnimationFrame(() => {
      this.tick();
      this.nextFrame();
    });
  }

  private tick() {
    const timeStamp = performance.now();
    const dt = Math.min(DT_MAX, (timeStamp - this.oldTimeStamp) / 1000);
    this.oldTimeStamp = timeStamp;

    const tick: TickEvent = new CustomEvent("tick", {
      bubbles: true,
      cancelable: true,
      composed: false,
      detail: { dt },
    });

    const gl = this.ctx;
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.canvas.dispatchEvent(tick);
  }
}
