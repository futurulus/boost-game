import { TickEvent } from "./types";

const DT_MAX = 0.1;

interface RelativityUniforms {
  cInvSq: WebGLUniformLocation;
  sign: WebGLUniformLocation;
  entityPosition: WebGLUniformLocation;
  viewPosition: WebGLUniformLocation;
  entityVelocity: WebGLUniformLocation;
  vertexTransform: WebGLUniformLocation;
  viewScreenTransform: WebGLUniformLocation;
};

interface RelativityAttribs {
  vertexOffset: number;
};

export class Renderer {
  ctx: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  shader: WebGLProgram;

  attribs: RelativityAttribs;
  uniforms: RelativityUniforms;

  running: boolean = false;
  oldTimeStamp: number = 0;

  constructor(ctx: WebGLRenderingContext, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.running = false;
    this.compileShaders();
  }

  private compileShaders() {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

    // Vertex shader
    const gl = this.ctx;
    const vertexShaderSource = `
      uniform float cInvSq, sign;
      uniform vec3 entityPosition, viewPosition;
      uniform vec2 entityVelocity;
      uniform mat3 vertexTransform;
      uniform mat4 viewScreenTransform;
      attribute vec3 vertexOffset;

      varying lowp vec3 vertexColor;

      void main() {
        vec3 offset = vertexTransform * vertexOffset;
        vec3 absPosition = entityPosition + offset;
        vec3 relPosition = absPosition - viewPosition;
        vec2 p0 = relPosition.xy - entityVelocity.xy * relPosition.z;
        float p0DotVel = dot(p0, entityVelocity) * cInvSq;
        float invGammaSq = 1. - dot(entityVelocity, entityVelocity) * cInvSq;

        float t = (
            p0DotVel + sign * sqrt(p0DotVel * p0DotVel + invGammaSq * dot(p0, p0) * cInvSq)
        ) / invGammaSq + viewPosition.z - absPosition.z;
        vec3 trueOffset = offset + t * vec3(entityVelocity, 1.);
        vec3 truePosition = entityPosition + trueOffset;
        gl_Position = viewScreenTransform * vec4(truePosition, 1.),
        vertexColor = 0.5 * gl_Position.xyz + 0.5;
        // vertexColor = 10. * trueOffset.z * vec3(-1., 0., 1.);
      }
    `;
    const fragmentShaderSource = `
      varying lowp vec3 vertexColor;
      void main() {
        gl_FragColor = vec4(vertexColor.rgb, 1.);
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

    const uniforms = {
      cInvSq: -1,
      sign: -1,
      entityPosition: -1,
      viewPosition: -1,
      entityVelocity: -1,
      vertexTransform: -1,
      viewScreenTransform: -1,
    };
    Object.keys(uniforms).forEach(key => {
      const location = gl.getUniformLocation(shaderProgram, key);
      if (location === null) throw `Unable to get uniform location for "${key}"`;
      uniforms[key] = location;
    });
    this.uniforms = uniforms;

    this.attribs = {
      vertexOffset: gl.getAttribLocation(shaderProgram, "vertexOffset"),
    };

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

  attrib(params: {key: keyof RelativityAttribs, buffer: WebGLBuffer, numComponents: number}) {
    const { key, buffer, numComponents } = params;
    const gl = this.ctx;

    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0; // 0 = use type and numComponents above
    const offset = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(
      this.attribs[key],
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(this.attribs[key]);
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
