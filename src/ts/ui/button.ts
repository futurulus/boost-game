import { mat4 } from "gl-matrix";
import { getMousePos } from "../gui";
import { Renderer } from "../render";
import { Vec2 } from "../types";

type Props = {
  renderer: Renderer;
  position: Vec2;
  scale: Vec2;
  color: [number, number, number, number];
  image: string;
  isSelected: () => boolean;
  onclick: () => void;
}

let backgroundTexture: WebGLTexture | null = null;

export class ImageButton {
  props: Props;
  positionBuffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
  texture: WebGLTexture;

  private hitPath: Path2D

  constructor(props: Props) {
    this.props = props;

    const { position, scale } = props;
    const { canvas } = props.renderer;

    this.hitPath = new Path2D();
    this.hitPath.moveTo(position.x + scale.x, position.y);
    this.hitPath.ellipse(position.x, position.y, scale.x, scale.y, 0, 0, 2 * Math.PI);

    this.initBuffers();

    canvas.addEventListener("click", e => this.onClick(e));
    canvas.addEventListener("tick", () => this.draw());
  }

  onClick(e: MouseEvent) {
    const { onclick, renderer } = this.props;
    const { x, y } = getMousePos(e.clientX, e.clientY, renderer.canvas);
    if (!this.containsPoint(x, y)) return;
    onclick();
  }

  private initBuffers() {
    const gl = this.props.renderer.ctx;

    const positionBuffer = gl.createBuffer();
    if (positionBuffer === null) throw "Unable to create position buffer";
    const positions = [
      1, 1,    -1, 1,   -1, -1,
      -1, -1,  1, -1,   1, 1,
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    this.positionBuffer = positionBuffer;

    this.texture = this.props.renderer.loadTexture(this.props.image);
    if (backgroundTexture === null) {
      backgroundTexture = this.props.renderer.loadTexture("assets/button.png");
    }

    // Flip image pixels into the bottom-to-top order that WebGL expects.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const texCoordBuffer = gl.createBuffer();
    if (texCoordBuffer === null) throw "Unable to create texture coordinate buffer";
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

    const textureCoordinates = [
      1, 0,  0, 0,  0, 1,
      0, 1,  1, 1,  1, 0,
    ];

    gl.bufferData(
      gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW
    );
    this.texCoordBuffer = texCoordBuffer;
  }

  private containsPoint(x: number, y: number): boolean {
    const { position: { x: cx, y: cy }, scale: { x: rx, y: ry } } = this.props;
    return (
      x >= cx - rx && x < cx + rx &&
      y >= cy - ry && y < cy + ry
    );
  }

  draw() {
    const { position, scale, color, isSelected } = this.props;
    const { ctx: gl, canvas, ui } = this.props.renderer;

    gl.useProgram(ui.program);

    const viewScreenTransform = mat4.create();
    const { width: w, height: h } = canvas;
    // Transform screen coordinates to normalized device coordinates [-1, 1]^3
    mat4.ortho(viewScreenTransform, 0, w, h, 0, -1, 1);
    // Force the z coordinate to be equal to the object's configured z-depth
    const depth = 0.5;  // TODO: z-ordering of objects
    mat4.translate(viewScreenTransform, viewScreenTransform, [position.x, position.y, depth]);
    mat4.scale(viewScreenTransform, viewScreenTransform, [scale.x, scale.y, 0]);
    gl.uniformMatrix4fv(ui.uniforms.viewScreenTransform, false, viewScreenTransform);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if (backgroundTexture !== null) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
    }

    ui.attrib({key: "vertexPosition", buffer: this.positionBuffer, numComponents: 2});
    ui.attrib({key: "texCoord", buffer: this.texCoordBuffer, numComponents: 2});

    const vertexCount = 6;

    const drawSelected = isSelected() && backgroundTexture !== null;
    if (drawSelected) {
      gl.uniform1i(ui.uniforms.image, 1);
      gl.uniform4fv(ui.uniforms.color, color);
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }

    gl.uniform1i(ui.uniforms.image, 0);
    gl.uniform4fv(ui.uniforms.color, drawSelected ? [0, 0, 0, 1] : color);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }
}