import { TickEvent } from "./types";
import { Shader } from "./shader";

const DT_MAX = 0.1;

type UIUniforms = {
  color: WebGLUniformLocation;
  viewScreenTransform: WebGLUniformLocation;
};

type UIAttribs = {
  vertexPosition: number;
}

type LightConeUniforms = {
  cInvSq: WebGLUniformLocation;
  sign: WebGLUniformLocation;
  entityVelocity2: WebGLUniformLocation;
  vertexTransform: WebGLUniformLocation;
  viewScreenTransform: WebGLUniformLocation;
};

type LightConeAttribs = {
  vertexOffset: number;
  vertexColor: number;
};

export class Renderer {
  ctx: WebGLRenderingContext;
  canvas: HTMLCanvasElement;

  ui: Shader<UIUniforms, UIAttribs>;
  lightCone: Shader<LightConeUniforms, LightConeAttribs>;

  running: boolean = false;
  oldTimeStamp: number = 0;

  constructor(ctx: WebGLRenderingContext, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.running = false;
    this.compileShaders();
  }

  private compileShaders() {
    this.compileLightConeShader();
    this.compileUIShader();
  }

  private compileLightConeShader() {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

    // Vertex shader
    const gl = this.ctx;
    const vertexShaderSource = `#version 300 es
      uniform float cInvSq, sign;
      uniform vec2 entityVelocity2;
      uniform mat4 vertexTransform, viewScreenTransform;
      in vec4 vertexOffset, vertexColor;

      out lowp vec4 interpColor;

      void main() {
        vec3 relPosition = (vertexTransform * vertexOffset).xyz;
        vec2 p0 = relPosition.xy - entityVelocity2.xy * relPosition.z;
        float p0DotVel = dot(p0, entityVelocity2) * cInvSq;
        float invGammaSq = 1. - dot(entityVelocity2, entityVelocity2) * cInvSq;

        float dt = (
            p0DotVel + sign * sqrt(p0DotVel * p0DotVel + invGammaSq * dot(p0, p0) * cInvSq)
        ) / invGammaSq - relPosition.z;
        vec3 trueRelPosition = relPosition + dt * vec3(entityVelocity2, 1.);
        gl_Position = viewScreenTransform * vec4(trueRelPosition, 1.),
        interpColor = vertexColor;
      }
    `;
    const fragmentShaderSource = `#version 300 es
      in lowp vec4 interpColor;

      out lowp vec4 outColor;

      void main() {
        outColor = interpColor;
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
      entityVelocity2: -1,
      vertexTransform: -1,
      viewScreenTransform: -1,
    };
    Object.keys(uniforms).forEach(key => {
      const location = gl.getUniformLocation(shaderProgram, key);
      if (location === null) throw `Unable to get uniform location for "${key}"`;
      uniforms[key] = location;
    });

    const attribs = {
      vertexOffset: gl.getAttribLocation(shaderProgram, "vertexOffset"),
      vertexColor: gl.getAttribLocation(shaderProgram, "vertexColor"),
    };

    this.lightCone = new Shader<LightConeUniforms, LightConeAttribs>(
      this.ctx, shaderProgram, uniforms, attribs
    );
  }

  private compileUIShader() {
    // Vertex shader
    const gl = this.ctx;
    const vertexShaderSource = `#version 300 es
      uniform vec3 color;
      uniform mat4 viewScreenTransform;
      in vec4 vertexPosition;

      out lowp vec4 interpColor;

      void main() {
        gl_Position = viewScreenTransform * vertexPosition;
        interpColor = vec4(color, 1.);
      }
    `;
    const fragmentShaderSource = `#version 300 es
      in lowp vec4 interpColor;

      out lowp vec4 outColor;

      void main() {
        outColor = interpColor;
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
      color: -1,
      viewScreenTransform: -1,
    };
    Object.keys(uniforms).forEach(key => {
      const location = gl.getUniformLocation(shaderProgram, key);
      if (location === null) throw `Unable to get uniform location for "${key}"`;
      uniforms[key] = location;
    });

    const attribs = {
      vertexPosition: gl.getAttribLocation(shaderProgram, "vertexPosition"),
    };
    this.ui = new Shader<UIUniforms, UIAttribs>(this.ctx, shaderProgram, uniforms, attribs);
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
