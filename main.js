import * as THREE from 'https://cdn.skypack.dev/three@0.150.0';
import { EffectComposer } from 'https://unpkg.com/three@0.150.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.150.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.150.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.150.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.150.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { EffectShader } from "./EffectShader.js";
import { OrbitControls } from 'https://unpkg.com/three@0.150.0/examples/jsm/controls/OrbitControls.js';
import { AssetManager } from './AssetManager.js';
import { Stats } from "./stats.js";
async function main() {
    // Setup basic renderer, controls, and profiler
    const clientWidth = window.innerWidth * 0.99;
    const clientHeight = window.innerHeight * 0.98;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.set(50, 75, 50);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(clientWidth, clientHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 25, 0);
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    // Setup scene
    // Skybox
    const environment = new THREE.CubeTextureLoader().load([
        "skybox/Box_Right.bmp",
        "skybox/Box_Left.bmp",
        "skybox/Box_Top.bmp",
        "skybox/Box_Bottom.bmp",
        "skybox/Box_Front.bmp",
        "skybox/Box_Back.bmp"
    ]);
    environment.encoding = THREE.sRGBEncoding;
    scene.background = environment;
    // Lighting
    const ambientLight = new THREE.AmbientLight(new THREE.Color(1.0, 1.0, 1.0), 0.25);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35);
    directionalLight.position.set(150, 200, 50);
    // Shadows
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.left = -75;
    directionalLight.shadow.camera.right = 75;
    directionalLight.shadow.camera.top = 75;
    directionalLight.shadow.camera.bottom = -75;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.blurSamples = 8;
    directionalLight.shadow.radius = 4;
    scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.15);
    directionalLight2.color.setRGB(1.0, 1.0, 1.0);
    directionalLight2.position.set(-50, 200, -150);
    scene.add(directionalLight2);
    // Objects
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    ground.castShadow = true;
    ground.receiveShadow = true;
    //scene.add(ground);
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.0, 0.0) }));
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.y = 5.01;
    // scene.add(box);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(6.25, 32, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 1.0, roughness: 0.25 }));
    sphere.position.y = 7.5;
    sphere.position.x = 25;
    sphere.position.z = 25;
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    // scene.add(sphere);
    const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(5, 1.5, 200, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 0.5, roughness: 0.5, color: new THREE.Color(0.0, 1.0, 0.0) }));
    torusKnot.position.y = 10;
    torusKnot.position.x = -25;
    torusKnot.position.z = -25;
    torusKnot.castShadow = true;
    torusKnot.receiveShadow = true;
    // scene.add(torusKnot);
    // Build postprocessing stack
    // Render Targets
    const defaultTexture = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    defaultTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientHeight, THREE.FloatType);
    // Post Effects
    const composer = new EffectComposer(renderer);
    const smaaPass = new SMAAPass(clientWidth, clientHeight);
    const effectPass = new ShaderPass(EffectShader);
    composer.addPass(effectPass);
    composer.addPass(new ShaderPass(GammaCorrectionShader));
    composer.addPass(smaaPass);
    const havok = await HavokPhysics();
    console.log(havok);
    const world = havok.HP_World_Create()[1];
    havok.HP_World_SetGravity(world, [0, -9.81, 0]);
    const boxMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: new THREE.Color(1.0, 1.0, 1.0) });
    const createBoxBody = (position, rotation, scale, motionType, mesh = true) => {
            const q = new THREE.Quaternion();
            q.setFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z));
            const boxBody = havok.HP_Body_Create()[1];
            havok.HP_Body_SetShape(
                boxBody,
                havok.HP_Shape_CreateBox(
                    [0, 0, 0], [0, 0, 0, 1], [scale.x, scale.y, scale.z]
                )[1]
            );
            havok.HP_Body_SetQTransform(
                boxBody, [
                    [position.x, position.y, position.z],
                    [q.x, q.y, q.z, q.w]
                ]
            )
            havok.HP_World_AddBody(world, boxBody, false);
            havok.HP_Body_SetMotionType(boxBody, havok.MotionType[motionType]);
            if (!mesh) return { offset: havok.HP_Body_GetWorldTransformOffset(boxBody)[1], id: boxBody }
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(scale.x, scale.y, scale.z),
                boxMat
            )
            body.castShadow = true;
            body.receiveShadow = true;
            body.matrixAutoUpdate = false;
            scene.add(body);
            return {
                offset: havok.HP_Body_GetWorldTransformOffset(boxBody)[1],
                id: boxBody,
                mesh: body
            }
        }
        // Make ground
    const groundBody = createBoxBody(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(100, 0.1, 100), "STATIC");
    const bodies = [groundBody];
    const instancedBoxes = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: new THREE.Color(1.0, 1.0, 1.0) }), 10000);
    instancedBoxes.bodies = [];
    instancedBoxes.castShadow = true;
    instancedBoxes.receiveShadow = true;
    for (let i = 0; i < 5000; i++) {
        instancedBoxes.setColorAt(i, new THREE.Color(Math.random(), Math.random(), Math.random()));
        const boxBody = createBoxBody(new THREE.Vector3(Math.random() * 50 - 25, Math.random() * 100 + 50, Math.random() * 50 - 25), new THREE.Vector3(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2), new THREE.Vector3(2, 2, 2), "DYNAMIC", false);
        instancedBoxes.bodies.push(boxBody);
        // bodies.push(boxBody);
    }
    const clock = new THREE.Clock();
    scene.add(instancedBoxes);

    function animate() {
        const delta = clock.getDelta();
        havok.HP_World_Step(world, delta);

        const bodyBuffer = havok.HP_World_GetBodyBuffer(world)[1];
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            const transformBuffer = new Float32Array(havok.HEAPU8.buffer, bodyBuffer + body.offset, 16);
            //body.mesh.matrix.fromArray(transformBuffer);
            for (let mi = 0; mi < 15; mi++) {
                if ((mi & 3) != 3) {
                    body.mesh.matrix.elements[mi] = transformBuffer[mi];
                }
            }
            body.mesh.matrix.elements[15] = 1.0;
        }
        const barr = instancedBoxes.instanceMatrix.array;
        for (let i = 0; i < instancedBoxes.bodies.length; i++) {
            const body = instancedBoxes.bodies[i];
            const transformBuffer = new Float32Array(havok.HEAPU8.buffer, bodyBuffer + body.offset, 16);
            const offset = 16 * i;
            for (let mi = 0; mi < 15; mi++) {
                if ((mi & 3) != 3) {
                    barr[offset + mi] = transformBuffer[mi];
                }
            }
            barr[offset + 15] = 1.0;
        }
        instancedBoxes.instanceMatrix.needsUpdate = true;
        renderer.setRenderTarget(defaultTexture);
        renderer.clear();
        renderer.render(scene, camera);
        effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
        composer.render();
        controls.update();
        stats.update();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
main();