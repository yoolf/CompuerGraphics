"use strict";

var canvas;
var gl;

var numVertices = 36;

var texSize = 64;

var pointsArray = [];
var normalsArray = [];
var texCoordsArray = [];

var texture;

// 텍스쳐 매핑을 위함
var texCoord = [
   vec2(0, 0),
   vec2(0, 1),
   vec2(1, 1),
   vec2(1, 0)
];

var vertices = [
   vec4(-0.3, -0.5, 0.7, 1.0),
   vec4(-0.3, 0.5, 0.7, 1.0),
   vec4(0.3, 0.5, 0.7, 1.0),
   vec4(0.3, -0.5, 0.7, 1.0),
   vec4(-0.3, -0.5, -0.7, 1.0),
   vec4(-0.3, 0.5, -0.7, 1.0),
   vec4(0.3, 0.5, -0.7, 1.0),
   vec4(0.3, -0.5, -0.7, 1.0),
];

// 조명 속성
var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
var lightAmbient = vec4(1.0, 0.0, 1.0, 0.0);
var lightDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

// 물질 속성
var materialAmbient = vec4(1.0, 0.0, 1.0, 0.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 70.0;

var ctm;
var ambientColor, diffuseColor, specularColor;
var modelView, projection;
var viewerPos;
var program;


// 오브젝트 회전을 위해 축 설정
var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 1;

// 회전 축 설정 위함
var theta = [0, 0, 0];

var thetaLoc;

// 회전 방향 등 변경하기 위한 변수
var flag = true;

function configureTexture(image) {  // 텍스쳐 이미지 설정하기 위한 함수
   texture = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, texture);
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

   gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function quad(a, b, c, d) { // 사각형 + 법선(조명)

   var t1 = subtract(vertices[b], vertices[a]);
   var t2 = subtract(vertices[c], vertices[b]);
   var normal = cross(t1, t2);
   var normal = vec3(normal);
   normal = normalize(normal);


   pointsArray.push(vertices[a]);
   normalsArray.push(normal);
   texCoordsArray.push(texCoord[0]);

   pointsArray.push(vertices[b]);
   normalsArray.push(normal);
   texCoordsArray.push(texCoord[1]);

   pointsArray.push(vertices[c]);
   normalsArray.push(normal);
   texCoordsArray.push(texCoord[2]);
   
   pointsArray.push(vertices[a]);
   normalsArray.push(normal);
   texCoordsArray.push(texCoord[0]);

   pointsArray.push(vertices[c]);
   normalsArray.push(normal);
   texCoordsArray.push(texCoord[2]);
   
   pointsArray.push(vertices[d]);
   normalsArray.push(normal);
   texCoordsArray.push(texCoord[3]);
}

// 오브젝트 정점 이어 붙이기
function billboard() {
   quad(1, 0, 3, 2);
   quad(2, 3, 7, 6);
   quad(3, 0, 4, 7);
   quad(6, 5, 1, 2);
   quad(4, 5, 6, 7);
   quad(5, 4, 0, 1);
}

window.onload = function init() {
   canvas = document.getElementById("gl-canvas");

   gl = WebGLUtils.setupWebGL(canvas);
   if (!gl) { alert("WebGL isn't available"); }

   gl.viewport(0, 0, canvas.width, canvas.height);

   gl.clearColor(0.0, 0.0, 0.0, 0.5);  // 캔버스 색상 설정
   gl.enable(gl.DEPTH_TEST);  // depth buffer 허용

   program = initShaders(gl, "vertex-shader", "fragment-shader");
   gl.useProgram( program );

   billboard();

   // |---- 인덱스 GPU에 전달 
   var nBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

   var vNormal = gl.getAttribLocation(program, "vNormal");
   gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(vNormal);

   var vBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

   var vPosition = gl.getAttribLocation(program, "vPosition");
   gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(vPosition);

   var tBuffer = gl.createBuffer();
   gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
   gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

   var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
   gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
   gl.enableVertexAttribArray( vTexCoord );
   // 인덱스 GPU에 전달 ----|

   thetaLoc = gl.getUniformLocation(program, "theta");

   // 시점 설정
   viewerPos = vec3(0.0, 0.0, 20.0);

   projection = ortho(-2, 2, -2, 2, -100, 100);

   
   // |---- 텍스쳐 이미지 
   var image = document.getElementById("texImage");
   window.onload = configureTexture(image);
   var image = document.getElementById("backTexImgage");
   //window.onload = configureTexture(image);
   // 텍스쳐 이미지 ----|
   
   
   // |---- 회전 등 상호작용
    document.getElementById("ButtonT").onclick = function () { flag = !flag; };
   document.getElementById("slider0").onchange = function (event) { theta[xAxis] = event.target.value; };
   document.getElementById("slider2").onchange = function (event) { theta[zAxis] = event.target.value; };
   // 상호작용 ----/
   
   // |---- 조명 설정 
   var ambientProduct = mult(lightAmbient, materialAmbient);
   var diffuseProduct = mult(lightDiffuse, materialDiffuse);
   var specularProduct = mult(lightSpecular, materialSpecular);

   gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
   gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
   gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
   gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
   
   gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
   // 조명 설정 ----|

   gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projection));

   render();
}


var render = function () {

   // 색상 버퍼, 깊이 버퍼 초기화
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   if(flag) theta[axis] += 1.0; // 자동 회전, 속도 지정 (1.0 속도)

   modelView = mat4();
   modelView = mult(modelView, rotate(theta[xAxis], [1, 0, 0]));
   modelView = mult(modelView, rotate(theta[yAxis], [0, 1, 0]));
   modelView = mult(modelView, rotate(theta[zAxis], [0, 0, 1]));

   gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelView));

   gl.drawArrays(gl.TRIANGLES, 0, numVertices);


   requestAnimFrame(render);
}
