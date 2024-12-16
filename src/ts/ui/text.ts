import { mat4 } from "gl-matrix";
import { Renderer } from "../render";
import { Vec2, vec2 } from "../types";

type PropsArgs = {
  renderer: Renderer;
  text: string;
  fontImage: string;
  position: Vec2;
  scale?: Vec2;
  depth?: number;
  color?: [number, number, number, number];
}

type Props = {
  renderer: Renderer;
  text: string;
  fontImage: string;
  position: Vec2;
  scale: Vec2;
  depth: number;
  color: [number, number, number, number];
}

export class Text {
  props: Props;

  private _isEnabled: boolean;
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;
  private viewScreenTransform: mat4;
  private vertexCount: number;
  private texture: WebGLTexture;
  private texImage: HTMLImageElement;

  constructor(props: PropsArgs) {
    this.props = {
      ...props,
      scale: props.scale ?? vec2(1, 1),
      depth: props.depth ?? 1,
      color: props.color ?? [1, 1, 1, 1],
    };

    this.initBuffers();
    this._isEnabled = true;

    props.renderer.canvas.addEventListener("tick", () => this.draw());
  }

  private initBuffers() {
    const gl = this.props.renderer.ctx;
    const { text, fontImage, position, depth, scale } = this.props;

    this.texture = this.props.renderer.loadTexture(fontImage, (this.texImage = new Image()));
    // Flip image pixels into the bottom-to-top order that WebGL expects.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const positionBuffer = gl.createBuffer();
    if (positionBuffer === null) throw "Unable to create position buffer";
    this.positionBuffer = positionBuffer;

    const texCoordBuffer = gl.createBuffer();
    if (texCoordBuffer === null) throw "Unable to create texture coordinate buffer";
    this.texCoordBuffer = texCoordBuffer;

    this.updateBufferData();
  }

  draw() {
    if (!this._isEnabled) return;

    this.updateBufferData();

    const {
      color,
      renderer: { ctx: gl, ui },
    } = this.props;

    gl.uniformMatrix4fv(ui.uniforms.viewScreenTransform, false, this.viewScreenTransform);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    ui.attrib({key: "vertexPosition", buffer: this.positionBuffer, numComponents: 2});
    ui.attrib({key: "texCoord", buffer: this.texCoordBuffer, numComponents: 2});

    gl.uniform1i(ui.uniforms.image, 0);
    gl.uniform4fv(ui.uniforms.color, color);
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  set isEnabled(v: boolean) {
    this._isEnabled = v;
  }

  updateBufferData() {
    const {
      position,
      depth,
      scale,
      text,
      renderer: { ctx: gl, canvas, ui },
    } = this.props;
    const chars = [...text];
    const { naturalWidth: fontWidth, naturalHeight: fontHeight} = this.texImage;
    const cw = fontWidth / 16;
    const ch = fontWidth / 16;

    gl.useProgram(ui.program);

    this.viewScreenTransform = mat4.create();
    const { width: w, height: h } = canvas;
    // Transform screen coordinates to normalized device coordinates [-1, 1]^3
    mat4.ortho(this.viewScreenTransform, 0, w, h, 0, -1, 1);
    // Force the z coordinate to be equal to the object's configured z-depth
    mat4.translate(this.viewScreenTransform, this.viewScreenTransform, [position.x, position.y, depth]);
    mat4.scale(this.viewScreenTransform, this.viewScreenTransform, [scale.x, scale.y, 0]);

    const positions = chars.flatMap((c, i) => {
        const x0 = i * cw;
        const x1 = x0 + cw;
        return [
            x1, 0,   x0, 0,   x0, ch,
            x0, ch,  x1, ch,  x1, 0,
        ];
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const textureCoordinates = chars.flatMap((c, i) => {
        let codePoint = c.codePointAt(0);
        if (c.length > 1 || codePoint == null || codePoint > 0xff) codePoint = 0xbf;  // ¿

        const u0 = (codePoint & 0xf) * 0.0625;
        const u1 = u0 + 0.0625;
        const v0 = 1 - (codePoint >> 4) * 0.0625;
        const v1 = v0 - 0.0625;
        return [
            u1, v0,  u0, v0,  u0, v1,
            u0, v1,  u1, v1,  u1, v0,
        ];
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW
    );

    this.vertexCount = 6 * chars.length;
  }
}