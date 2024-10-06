export class Shader<U, A extends {[key: string]: number}> {
  ctx: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: U;
  attribs: A;

  constructor(ctx: WebGLRenderingContext, program: WebGLProgram, uniforms: U, attribs: A) {
    this.ctx = ctx;
    this.program = program;
    this.uniforms = uniforms;
    this.attribs = attribs;
  }

  attrib(params: {key: keyof A, buffer: WebGLBuffer, numComponents: number}) {
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
}