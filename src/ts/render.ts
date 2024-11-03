import { C_INV_SQ, TickEvent } from "./types";
import { Shader } from "./shader";

const DT_MAX = 0.1;

export type UIUniforms = {
  color: WebGLUniformLocation;
  image: WebGLUniformLocation;
  viewScreenTransform: WebGLUniformLocation;
};

export type UIAttribs = {
  vertexPosition: number;
  texCoord: number;
}

export type NowUniforms = {
  entityVelocity2: WebGLUniformLocation;
  vertexTransform: WebGLUniformLocation;
  viewScreenTransform: WebGLUniformLocation;
};

export type LightConeUniforms = NowUniforms & {
  sign: WebGLUniformLocation;
};

export type EntityAttribs = {
  vertexOffset: number;
  vertexColor: number;
};

export class Renderer {
  ctx: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;

  ui: Shader<UIUniforms, UIAttribs>;
  now: Shader<NowUniforms, EntityAttribs>;
  lightCone: Shader<LightConeUniforms, EntityAttribs>;

  running: boolean = false;
  oldTimeStamp: number = 0;

  constructor(ctx: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.running = false;
    this.compileShaders();

    ctx.enable(ctx.DEPTH_TEST);
    ctx.depthFunc(ctx.LEQUAL);
    ctx.enable(ctx.BLEND);
    ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);
  }

  private compileShaders() {
    this.compileLightConeShader();
    this.compileNowShader();
    this.compileUIShader();
  }

  private compileLightConeShader() {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

    // Vertex shader
    const gl = this.ctx;
    const vertexShaderSource = `#version 300 es
      uniform float sign;
      uniform vec2 entityVelocity2;
      uniform mat4 vertexTransform, viewScreenTransform;
      in vec4 vertexOffset, vertexColor;

      out lowp vec4 interpColor;

      void main() {
        vec3 relPosition = (vertexTransform * vertexOffset).xyz;
        vec2 p0 = relPosition.xy - entityVelocity2.xy * relPosition.z;
        float p0DotVel = dot(p0, entityVelocity2) * ${C_INV_SQ};
        float invGammaSq = 1. - dot(entityVelocity2, entityVelocity2) * ${C_INV_SQ};

        float dt = (
            p0DotVel + sign * sqrt(p0DotVel * p0DotVel + invGammaSq * dot(p0, p0) * ${C_INV_SQ})
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

    this.lightCone = new Shader<LightConeUniforms, EntityAttribs>(
      this.ctx, shaderProgram, uniforms, attribs
    );
  }

  private compileNowShader() {
    // Vertex shader
    const gl = this.ctx;
    const vertexShaderSource = `#version 300 es
      uniform vec2 entityVelocity2;
      uniform mat4 vertexTransform, viewScreenTransform;
      in vec4 vertexOffset, vertexColor;

      out lowp vec4 interpColor;

      void main() {
        vec3 relPosition = (vertexTransform * vertexOffset).xyz;
        // Note that p0 and entityVelocity2 are different from in the light
        // cone shader: here they are in the camera reference frame, whereas in
        // the light cone shader they're in world coordinates.
        vec2 p0 = relPosition.xy - entityVelocity2.xy * relPosition.z;
        gl_Position = viewScreenTransform * vec4(p0, 0., 1.),
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
      entityVelocity2: -1,
      vertexTransform: -1,
      viewScreenTransform: -1,
    };
    Object.keys(uniforms).forEach(key => {
      const location = gl.getUniformLocation(shaderProgram, key);
      if (location === null) throw `Unable to get uniform location for "${key}"`;
      uniforms[key] = location;
    })

    const attribs = {
      vertexOffset: gl.getAttribLocation(shaderProgram, "vertexOffset"),
      vertexColor: gl.getAttribLocation(shaderProgram, "vertexColor"),
    };

    this.now = new Shader<NowUniforms, EntityAttribs>(
      this.ctx, shaderProgram, uniforms, attribs
    );
  }

  private compileUIShader() {
    // Vertex shader
    const gl = this.ctx;
    const vertexShaderSource = `#version 300 es
      uniform vec4 color;
      uniform mat4 viewScreenTransform;
      in vec4 vertexPosition;
      in vec2 texCoord;

      out lowp vec4 interpColor;
      out lowp vec2 interpTexCoord;

      void main() {
        gl_Position = viewScreenTransform * vertexPosition;
        interpColor = color;
        interpTexCoord = texCoord;
      }
    `;
    const fragmentShaderSource = `#version 300 es
      in lowp vec4 interpColor;
      in lowp vec2 interpTexCoord;

      uniform sampler2D image;

      out lowp vec4 outColor;

      void main() {
        outColor = interpColor * texture(image, interpTexCoord);
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
      image: -1,
      viewScreenTransform: -1,
    };
    Object.keys(uniforms).forEach(key => {
      const location = gl.getUniformLocation(shaderProgram, key);
      if (location === null) throw `Unable to get uniform location for "${key}"`;
      uniforms[key] = location;
    });

    const attribs = {
      texCoord: gl.getAttribLocation(shaderProgram, "texCoord"),
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

  loadTexture(url: string | null) {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
    const gl = this.ctx;

    const texture = gl.createTexture();
    if (texture === null) throw "Unable to create texture";
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    //
    // Passing url=null simply returns this 1-pixel texture (useful for
    // solid-color UI elements).
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 255, 255, 255]); // opaque white
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel,
    );

    if (url === null) return texture;

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image,
      );

      gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;

    return texture;
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
