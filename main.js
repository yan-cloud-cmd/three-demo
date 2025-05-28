import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 创建场景
const scene = new THREE.Scene();

// 相机设置
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 控制器
const controls = new OrbitControls(camera, renderer.domElement);

// 经纬度转球面坐标
function latLongToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// 地球半径
const earthRadius = 50;

// 创建地球
const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
const earthTexture = new THREE.TextureLoader().load('texture/803248-20200305142954037-195792468.jpg');
const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);
let followCamera = false;

const button = document.getElementById('toggleFollow');
button.addEventListener('click', () => {
  followCamera = !followCamera;
  button.textContent = followCamera ? '关闭相机跟随' : '开启相机跟随';
  controls.enabled = !followCamera;  // 禁用 OrbitControls
});

// 西藏中心点
const tibetCenter = latLongToVector3(30, 90, earthRadius);
camera.position.set(tibetCenter.x , tibetCenter.y , tibetCenter.z -50);
controls.target.copy(tibetCenter);

// 直射西藏的太阳光
const sunlight = new THREE.DirectionalLight(0xffffff, 1.2);
sunlight.position.set(tibetCenter.x , tibetCenter.y , tibetCenter.z -50);
sunlight.target.position.copy(tibetCenter);
scene.add(sunlight);
scene.add(sunlight.target);

// 环境光
scene.add(new THREE.AmbientLight(0x404040, 2));

// 路径（贴近地球表面）
const pathLatLon = [
  [31, 89],
  [30.5, 90.5],
  [30, 92],
  [29.5, 91],
  [29, 89.5]
];
const pathPoints = pathLatLon.map(([lat, lon]) => latLongToVector3(lat, lon, earthRadius + 0.5));
const curve = new THREE.CatmullRomCurve3(pathPoints);
const pathGeometry = new THREE.TubeGeometry(curve, 100, 0.3, 8, false);
const pathMaterial = new THREE.MeshBasicMaterial({ color:'#ffa85b',
  transparent: true,
  opacity: 0.3  // 你可以调成 0.1 ~ 0.9 之间
});
const pathTube = new THREE.Mesh(pathGeometry, pathMaterial);
scene.add(pathTube);

// 羊模型加载
let antelope;
const loader = new GLTFLoader();
loader.load('model/Gazelle.glb', (gltf) => {
  antelope = gltf.scene;
  antelope.scale.set(0.01, 0.01, 0.01);

  // 关键：修正模型朝向（使其“正面”朝路径方向，脚贴地）
  antelope.rotation.set(0, Math.PI / 2, 0); // 你可尝试不同角度以达到正确姿态

  scene.add(antelope);
});

// 动画控制
let progress = 0;
function animate() {
  requestAnimationFrame(animate);
  if (antelope) {
  const point = curve.getPointAt(progress);
  const tangent = curve.getTangentAt(progress);
  const up = point.clone().normalize();

  antelope.position.copy(point);
  antelope.up.copy(up);
  antelope.lookAt(point.clone().add(tangent));

  if (followCamera) {
    const followOffset = 5;
    const behindPosition = point.clone()
      .add(tangent.clone().normalize().multiplyScalar(-followOffset))
      .add(up.clone().multiplyScalar(2));

    camera.position.lerp(behindPosition, 0.1);
    camera.lookAt(point);
  } else {
    controls.update();
  }

  progress += 0.001;
  if (progress > 1) progress = 0;
}



  if (antelope) {
    const point = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress);
    const up = point.clone().normalize(); // 地球法线方向

    antelope.position.copy(point);
    antelope.up.copy(up); // 设置“脚朝地面”
    antelope.lookAt(point.clone().add(tangent)); // 让“脸朝前方”

    progress += 0.001;
    if (progress > 1) progress = 0;
  }

  renderer.render(scene, camera);
}
animate();

// 响应窗口变化
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
